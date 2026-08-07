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
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;
use App\Events\OrderItemsUpdated;
use App\Events\PrintJobDispatched;
use App\Listeners\CreatePrintJobsForOrder;

class OrderController extends Controller
{
    private function itemPriceForOrderType(Item $item, string $orderType): float
    {
        return $item->priceForOrderType($orderType);
    }

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
            ->orderBy('sort_order')
            ->orderBy('id')
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
            'items'          => 'nullable|array',
            'items.*.id'     => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'custom_items'   => 'nullable|array',
            'custom_items.*.name' => 'required|string|max:255',
            'custom_items.*.price' => 'required|numeric|min:0',
            'custom_items.*.quantity' => 'required|integer|min:1',
        ]);

        $items = $validated['items'] ?? [];
        $customItems = $validated['custom_items'] ?? [];

        if (count($items) === 0 && count($customItems) === 0) {
            throw ValidationException::withMessages([
                'items' => 'Add at least one menu item or one-time item.',
            ]);
        }

        $subtotal = 0;
        $orderItemsData = [];

        foreach ($items as $entry) {
            $item = Item::findOrFail($entry['id']);
            $price = $this->itemPriceForOrderType($item, $validated['order_type']);
            $subtotal += $price * $entry['quantity'];
            $orderItemsData[] = [
                'item_id'          => $item->id,
                'item_name'        => $item->name,
                'is_custom_item'   => false,
                'quantity'         => $entry['quantity'],
                'price'            => $price,
                'orderItem_status' => 'pending',
            ];
        }

        foreach ($customItems as $entry) {
            $name = trim((string) $entry['name']);
            $price = (float) $entry['price'];
            $quantity = (int) $entry['quantity'];

            $subtotal += $price * $quantity;
            $orderItemsData[] = [
                'item_id'          => null,
                'item_name'        => $name,
                'is_custom_item'   => true,
                'quantity'         => $quantity,
                'price'            => $price,
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
            'order_status' => 'required|in:pending,processing,completed',
        ]);

        $order->update(['order_status' => $request->order_status]);

        if ($request->order_status === 'completed' && $order->table_id) {
            $order->table()->update(['is_available' => true]);
        }

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

    public function cancel(Order $order)
    {
        if (auth()->user()?->type !== 'admin') {
            abort(403, 'Only admin can cancel orders.');
        }

        if (in_array($order->order_status, ['completed', 'cancelled'], true)) {
            return redirect()->back()->with('error', 'This order cannot be cancelled.');
        }

        $order->update(['order_status' => 'cancelled']);

        broadcast(new OrderStatusUpdated($order))->toOthers();

        return redirect()->back()->with('success', 'Order cancelled.');
    }

    public function updatePaymentStatus(Request $request, Order $order)
    {
        $request->validate([
            'payment_status' => 'required|in:pending,paid,failed',
            'payment_method' => 'nullable|string|in:Cash,Visa,Master,Uber,Pickme', // Added validation
        ]);

        $order->update([
            'payment_status' => $request->payment_status,
            'payment_method' => $request->payment_method ?? $order->payment_method, // Save method if provided
        ]);

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
                'order_id'       => $order->id,
                'counter_id'     => $counter->id,
                'interface_type' => $counter->interface_type,
                'printer_name'   => $counter->printer_name,
                'printer_ip'     => $counter->printer_ip,
                'printer_port'   => $counter->printer_port,
                'payload'        => [
                    'type'         => 'bill',
                    'order_number' => $order->order_number,
                    'order_type'   => str_replace('_', ' ', $order->order_type),
                    'table_name'   => $order->table?->name,
                    // Add dynamic date and time based on the order's creation
                    'date'         => $order->created_at->format('d-m-Y'),
                    'time'         => $order->created_at->format('h:i A'),
                    'counter'      => $counter->name ?? '01',
                    'items'        => $order->items->map(fn ($orderItem) => [
                        'name'     => $orderItem->item_name ?? $orderItem->item?->name ?? 'Unknown Item',
                        'quantity' => $orderItem->quantity,
                        // Format price to 2 decimal places string
                        'price'    => number_format((float) $orderItem->price, 2, '.', ''),
                    ])->values()->all(),
                    // Ensure totals are formatted properly for the printer
                    'sub_total'    => number_format((float) $order->total_price, 2, '.', ''),
                    'total_price'  => number_format((float) $order->total_price, 2, '.', ''),
                    'payment_method' => $order->payment_method ?? 'CASH', // Add this if available on your model
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
            ->orderBy('sort_order')
            ->orderBy('id')
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

        $newOrderItems = collect();

        foreach ($validated['items'] as $entry) {
            $item = Item::with('category.counters')->findOrFail($entry['id']);
            $price = $this->itemPriceForOrderType($item, $order->order_type);

            $existing = $order->items()
                ->where('item_id', $item->id)
                ->where('orderItem_status', 'pending')
                ->first();

            if ($existing) {
                $existing->increment('quantity', $entry['quantity']);

                // Represent only the newly added quantity for the kitchen ticket,
                // not the item's new running total.
                $ticketLine = (clone $existing)->setRelation('item', $item);
                $ticketLine->quantity = $entry['quantity'];
                $newOrderItems->push($ticketLine);
            } else {
                $created = $order->items()->create([
                    'item_id'          => $item->id,
                    'item_name'        => $item->name,
                    'is_custom_item'   => false,
                    'quantity'         => $entry['quantity'],
                    'price'            => $price,
                    'orderItem_status' => 'pending',
                ]);
                $created->setRelation('item', $item);
                $newOrderItems->push($created);
            }
        }

        $order->load('items');
        $subtotal = $order->items->sum(fn($oi) => $oi->price * $oi->quantity);

        $order->update([
            'subtotal'    => $subtotal,
            'total_price' => max(0, $subtotal - $order->discount),
        ]);

        $order->load(['user', 'table', 'items.item']);
        broadcast(new OrderItemsUpdated($order))->toOthers();

        // Print kitchen/station tickets for just the newly added items
        app(CreatePrintJobsForOrder::class)->createTicketJobs($order, $newOrderItems);

        return redirect()->route('orders.show', $order)->with('success', 'Items added to order.');
    }
}
