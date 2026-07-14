<?php

namespace App\Http\Controllers;

use App\Events\OrderItemStatusUpdated;
use App\Events\OrderPlaced;
use App\Events\OrderStatusUpdated;
use App\Models\Category;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTime;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;

class OrderController extends Controller
{
    public function index()
    {
        $orders = Order::with(['user', 'table', 'items.item'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('orders/index', [
            'orders' => $orders,
        ]);
    }

    public function create()
    {
        $categories = Category::with(['items' => fn($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get();

        $tables = Table::where('is_active', true)
            ->orderBy('name')
            ->get();

        $customers = User::where('type', 'customer')
            ->with('customer')
            ->orderBy('name')
            ->get()
            ->map(fn($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'phone' => $u->customer?->phone_number,
            ]);

        return Inertia::render('orders/create', [
            'categories' => $categories,
            'tables'     => $tables,
            'customers'  => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_type'     => 'required|in:dine_in,takeaway,delivery',
            'table_id'       => 'nullable|exists:tables,id',
            'user_id'        => 'nullable|exists:users,id',
            'customer_name'  => 'nullable|string|max:255',
            'payment_method' => 'nullable|string|max:100',
            'discount'       => 'nullable|numeric|min:0',
            'items'          => 'required|array|min:1',
            'items.*.id'     => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $subtotal = 0;
        $orderItemsData = [];

        foreach ($validated['items'] as $entry) {
            $item = Item::findOrFail($entry['id']);
            $subtotal += $item->price * $entry['quantity'];
            $orderItemsData[] = [
                'item_id'          => $item->id,
                'quantity'         => $entry['quantity'],
                'price'            => $item->price,
                'orderItem_status' => 'pending',
            ];
        }

        $lastOrder = \App\Models\Order::orderBy('id', 'desc')->first();
            if ($lastOrder) {
                $lastOrderNumber = $lastOrder->order_number;
                $lastOrderNumber = str_replace('CTB-', '', $lastOrderNumber);
                $lastOrderNumber = intval($lastOrderNumber);
                $order_number = 'CTB-' . str_pad($lastOrderNumber + 1, 6, '0', STR_PAD_LEFT);
            } else {
                $order_number = 'CTB-000001';
            }

        $discount   = (float) ($validated['discount'] ?? 0);
        $totalPrice = max(0, $subtotal - $discount);

        $order = Order::create([
            'order_number'   => $order_number,
            'order_type'     => $validated['order_type'],
            'order_status'   => 'pending',
            'payment_status' => 'pending',
            'payment_method' => $validated['payment_method'] ?? null,
            'user_id'        => $validated['user_id'] ?? null,
            'table_id'       => $validated['table_id'] ?? null,
            'subtotal'       => $subtotal,
            'discount'       => $discount,
            'total_price'    => $totalPrice,
        ]);

        foreach ($orderItemsData as $itemData) {
            $order->items()->create($itemData);
        }

        $order->load(['user', 'table', 'items.item']);
        broadcast(new OrderPlaced($order))->toOthers();

        return redirect()->route('orders.show', $order)->with('success', 'Order created successfully.');
    }

    public function show(Order $order)
    {
        $order->load(['user', 'table', 'items.item']);

        return Inertia::render('orders/show', [
            'order' => $order,
        ]);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $request->validate([
            'order_status' => 'required|in:pending,processing,completed,cancelled',
        ]);

        $order->update(['order_status' => $request->order_status]);

        $orderTime = OrderTime::firstOrNew(['order_id' => $order->id, 'item_id' => null]);
        if ($request->order_status === 'processing') {
            $orderTime->cooking_time = Carbon::now();
        } elseif ($request->order_status === 'completed') {
            $orderTime->ready_time = Carbon::now();
        }
        $orderTime->save();

        broadcast(new OrderStatusUpdated($order))->toOthers();

        return redirect()->back()->with('success', 'Order status updated.');
    }

    public function updatePaymentStatus(Request $request, Order $order)
    {
        $request->validate([
            'payment_status' => 'required|in:pending,paid,failed',
        ]);

        $order->update(['payment_status' => $request->payment_status]);

        broadcast(new OrderStatusUpdated($order))->toOthers();

        return redirect()->back()->with('success', 'Payment status updated.');
    }

    public function updateItemStatus(Request $request, Order $order, OrderItem $orderItem)
    {
        $request->validate([
            'orderItem_status' => 'required|in:pending,preparing,ready,served,cancelled',
        ]);

        $orderItem->update(['orderItem_status' => $request->orderItem_status]);

        $orderTime = OrderTime::firstOrNew(['order_id' => $order->id, 'item_id' => $orderItem->item_id]);
        if ($request->orderItem_status === 'preparing') {
            $orderTime->cooking_time = Carbon::now();
        } elseif (in_array($request->orderItem_status, ['ready', 'served'])) {
            $orderTime->ready_time = Carbon::now();
        }
        $orderTime->save();

        broadcast(new OrderItemStatusUpdated($orderItem))->toOthers();

        return redirect()->back()->with('success', 'Item status updated.');
    }

    public function receipt($orderId)
    {
    $order = \App\Models\Order::with('items.item', 'table', 'user')->findOrFail($orderId);

    $servedBy = $order->user?->name ?? 'Staff'; // or pass the staff user separately

    return view('orders.receipt', compact('order', 'servedBy'));
    }

    public function juiceBar()
    {
        $orders = Order::with([
            'user',
            'table',
            'items' => function ($query) {
                $query->whereHas('item.category.counters', function ($counterQuery) {
                    $counterQuery->whereRaw('LOWER(name) = ?', ['juice bar']);
                })->with(['item.category.counters']);
            },
        ])
            ->whereHas('items.item.category.counters', function ($counterQuery) {
                $counterQuery->whereRaw('LOWER(name) = ?', ['juice bar']);
            })
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('juice-bar/index', [
            'orders' => $orders,
        ]);
    }

    public function printSummary(Request $request, ShiftReportService $service)
    {
        $from = $request->input('from', now()->startOfDay());
        $to   = $request->input('to', now());

        $data = $service->build($from, $to);

        broadcast(new PrintJobDispatched([
            'job_type' => 'summary_report',
            'printer'  => 'counter', // fixed printer key, see below
            'payload'  => $data,
        ]));

        return back();
    }



    public function directPrintUSB($orderId)
    {
        $order = Order::with('items.item')->findOrFail($orderId);

        try {
            // Connect to the locally shared USB printer
            // Replace "ReceiptPrinter" with your exact share name
            $connector = new WindowsPrintConnector("ReceiptPrinter");
            $printer = new Printer($connector);

            $printer->setJustification(Printer::JUSTIFY_CENTER);
            $printer->text("Ceylon Table\n");
            $printer->text("Order: " . $order->order_number . "\n\n");

            $printer->setJustification(Printer::JUSTIFY_LEFT);
            foreach($order->items as $item) {
                $printer->text($item->quantity . "x " . $item->item->name . " - Rs." . $item->price . "\n");
            }

            $printer->feed(2);
            $printer->cut();
            $printer->close();

            return response()->json(['status' => 'printed']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function silentPrint(Order $order)
    {
        $order->load(['user', 'table', 'items.item']);

        try {
            // "ReceiptPrinter" MUST match the share name you set in Step 1
            $connector = new WindowsPrintConnector("ReceiptPrinter");
            $printer = new Printer($connector);

            // --- HEADER ---
            $printer->setJustification(Printer::JUSTIFY_CENTER);
            $printer->setTextSize(2, 2);
            $printer->text("Ceylon Table\n");
            $printer->setTextSize(1, 1);
            $printer->text("83, St Lucias Street, Kotahena\n");
            $printer->text("Tel: 011 234 7777\n");
            $printer->feed();

            $printer->setJustification(Printer::JUSTIFY_LEFT);
            $printer->text("Order: " . $order->order_number . "\n");
            $printer->text("Date: " . $order->created_at->format('d M Y, H:i') . "\n");
            $printer->text("Type: " . str_replace('_', ' ', $order->order_type) . "\n");
            $printer->text(str_repeat("-", 48) . "\n");

            // --- ITEMS ---
            foreach($order->items as $orderItem) {
                $itemName = $orderItem->item->name ?? 'Unknown Item';
                $qty = $orderItem->quantity;
                $price = number_format($orderItem->price * $qty, 2);

                // Format line to look like: "2x Kottu           Rs. 1200.00"
                $printer->text($qty . "x " . $itemName . "\n");
                $printer->setJustification(Printer::JUSTIFY_RIGHT);
                $printer->text("Rs. " . $price . "\n");
                $printer->setJustification(Printer::JUSTIFY_LEFT);
            }

            $printer->text(str_repeat("-", 48) . "\n");

            // --- TOTALS ---
            $printer->setJustification(Printer::JUSTIFY_RIGHT);
            $printer->text("Subtotal: Rs. " . number_format($order->subtotal, 2) . "\n");
            if ($order->discount > 0) {
                $printer->text("Discount: Rs. " . number_format($order->discount, 2) . "\n");
            }
            $printer->setTextSize(1, 2);
            $printer->text("TOTAL: Rs. " . number_format($order->total_price, 2) . "\n");
            $printer->setTextSize(1, 1);
            $printer->feed();

            // --- FOOTER ---
            $printer->setJustification(Printer::JUSTIFY_CENTER);
            $printer->text("Thank you for dining with us!\n");

            // Cut paper and close connection
            $printer->feed(3);
            $printer->cut();
            $printer->close();

            return redirect()->back()->with('success', 'Receipt sent to printer.');

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Printer Error: ' . $e->getMessage());
        }
    }
}
