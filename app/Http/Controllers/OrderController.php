<?php

namespace App\Http\Controllers;

use App\Events\OrderItemStatusUpdated;
use App\Events\OrderPlaced;
use App\Events\OrderStatusUpdated;
use App\Events\PrintJobCreated;
use App\Models\Category;
use App\Models\Counter;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTime;
use App\Models\PrintJob;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;
use App\Events\OrderItemsUpdated;

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



    public function silentPrint(Order $order)
    {
        $order->load(['user', 'table', 'items.item']);

        try {
            $counter = Counter::forRole('Front Counter');

            $printJob = PrintJob::create([
                'order_id'        => $order->id,
                'counter_id'      => $counter->id,
                'interface_type'  => $counter->interface_type,
                'printer_name'    => $counter->printer_name,
                'printer_ip'      => $counter->printer_ip,
                'printer_port'    => $counter->printer_port,
                'payload'         => [
                    'type'         => 'bill',
                    'order_number' => $order->order_number,
                    'order_type'   => str_replace('_', ' ', $order->order_type),
                    'table_name'   => $order->table?->name,
                    'items'        => $order->items->map(fn ($orderItem) => [
                        'name'     => $orderItem->item?->name ?? 'Unknown Item',
                        'quantity' => $orderItem->quantity,
                        'price'    => $orderItem->price,
                    ]),
                    'total_price'  => number_format($order->total_price, 2),
                ],
                'status' => 'pending',
            ]);

            broadcast(new PrintJobCreated($printJob));

            return redirect()->back()->with('success', 'Receipt sent to printer.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Printer Error: ' . $e->getMessage());
        }
    }

    public function edit(Order $order)
    {
        $order->load(['user', 'table', 'items.item']);

        $categories = Category::with(['items' => fn($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get();

        return Inertia::render('orders/edit', [
            'order'      => $order,
            'categories' => $categories,
        ]);
    }

    public function addItems(Request $request, Order $order)
    {
        $validated = $request->validate([
            'items'             => 'required|array|min:1',
            'items.*.id'        => 'required|exists:items,id',
            'items.*.quantity'  => 'required|integer|min:1',
        ]);

        foreach ($validated['items'] as $entry) {
            $item = Item::findOrFail($entry['id']);

            // Merge into an existing pending line for the same item, otherwise create a new one
            $existing = $order->items()
                ->where('item_id', $item->id)
                ->where('orderItem_status', 'pending')
                ->first();

            if ($existing) {
                $existing->increment('quantity', $entry['quantity']);
            } else {
                $order->items()->create([
                    'item_id'          => $item->id,
                    'quantity'         => $entry['quantity'],
                    'price'            => $item->price, // snapshot current price
                    'orderItem_status' => 'pending',
                ]);
            }
        }

        // Recalculate totals from the fresh set of items
        $order->load('items');
        $subtotal = $order->items->sum(fn($oi) => $oi->price * $oi->quantity);

        $order->update([
            'subtotal'    => $subtotal,
            'total_price' => max(0, $subtotal - $order->discount),
        ]);

        $order->load(['user', 'table', 'items.item']);
        broadcast(new OrderItemsUpdated($order))->toOthers();

        return redirect()->route('orders.show', $order)->with('success', 'Items added to order.');
    }
}
