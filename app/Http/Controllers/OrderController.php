<?php

namespace App\Http\Controllers;

use App\Events\OrderItemStatusUpdated;
use App\Events\OrderPlaced;
use App\Events\OrderStatusUpdated;
use App\Events\PrintJobCreated;
use App\Models\Category;
use App\Models\Counter;
use App\Models\Customer;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTime;
use App\Models\PrintJob;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;
use App\Events\OrderItemsUpdated;
use App\Events\PrintJobDispatched;
use App\Listeners\CreatePrintJobsForOrder;
use App\Services\RewardService;

class OrderController extends Controller
{
    private function itemPriceForOrderType(Item $item, string $orderType): float
    {
        return $item->priceForOrderType($orderType);
    }

    /**
     * Recompute subtotal/total from the order's current items.
     * Cancelled lines never count toward the total.
     */
    private function recalcTotals(Order $order): void
    {
        $order->load('items');

        $subtotal = $order->items
            ->where('orderItem_status', '!=', 'cancelled')
            ->sum(fn ($oi) => (float) $oi->price * $oi->quantity);

        $order->update([
            'subtotal'    => $subtotal,
            'total_price' => max(0, $subtotal - (float) $order->discount),
        ]);
    }

    public function index()
    {
        $orders = Order::with(['user', 'table', 'items.item', 'paymentSplits'])
            ->whereDate('created_at', Carbon::today())
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('orders/index', [
            'orders' => $orders,
        ]);
    }

    public function indexCompleted()
    {
        $orders = Order::with(['user', 'table', 'items.item', 'paymentSplits'])
            ->where('payment_status', 'paid')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('orders/completed', [
            'orders' => $orders,
        ]);
    }

    public function create()
    {
        $categories = Category::with(['items' => fn($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $tables = Table::where('is_active', true)->orderBy('name')->get();

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
            'order_type'     => 'required|in:dine_in,takeaway,delivery,uber,pickme',
            'table_id'       => 'nullable|exists:tables,id',
            'user_id'        => 'nullable|exists:users,id',
            'customer_name'  => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'discount'       => 'nullable|numeric|min:0',
            'items'          => 'nullable|array',
            'items.*.id'     => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes'  => 'nullable|string|max:1000',
            'custom_items'   => 'nullable|array',
            'custom_items.*.name' => 'required|string|max:255',
            'custom_items.*.price' => 'required|numeric|min:0',
            'custom_items.*.quantity' => 'required|integer|min:1',
            'custom_items.*.notes' => 'nullable|string|max:1000',
        ]);

        $items = $validated['items'] ?? [];
        $customItems = $validated['custom_items'] ?? [];

        if (count($items) === 0 && count($customItems) === 0) {
            throw ValidationException::withMessages([
                'items' => 'Add at least one menu item or one-time item.',
            ]);
        }

        $userId = $validated['user_id'] ?? null;

        if (! $userId && ! empty($validated['customer_name']) && ! empty($validated['customer_phone'])) {
            $existingCustomer = Customer::where('phone_number', $validated['customer_phone'])->first();

            if ($existingCustomer) {
                $userId = $existingCustomer->user_id;
            } else {
                $newUser = DB::transaction(function () use ($validated) {
                    $user = User::create([
                        'name'     => $validated['customer_name'],
                        'email'    => 'guest_' . Str::random(10) . '@ceylontable.lk',
                        'password' => Str::random(20),
                        'type'     => 'customer',
                    ]);

                    Customer::create([
                        'user_id'      => $user->id,
                        'first_name'   => $validated['customer_name'],
                        'last_name'    => '',
                        'phone_number' => $validated['customer_phone'],
                    ]);

                    return $user;
                });

                $userId = $newUser->id;
            }
        }

        $lastOrder = Order::orderBy('id', 'desc')
            ->where('created_at', '>=', now()->startOfDay())
            ->first();

        if ($lastOrder) {
            $lastOrderNumber = intval(str_replace('CTB-', '', $lastOrder->order_number));
            $order_number = 'CTB-' . str_pad($lastOrderNumber + 1, 6, '0', STR_PAD_LEFT);
        } else {
            $order_number = 'CTB-000001';
        }

        $discount = (float) ($validated['discount'] ?? 0);

        $order = DB::transaction(function () use ($validated, $items, $customItems, $userId, $order_number, $discount) {
            $order = Order::create([
                'order_number'   => $order_number,
                'order_type'     => $validated['order_type'],
                'order_status'   => 'pending',
                'payment_status' => 'pending',
                'user_id'        => $userId,
                'table_id'       => $validated['table_id'] ?? null,
                'subtotal'       => 0,
                'discount'       => $discount,
                'total_price'    => 0,
            ]);

            foreach ($items as $entry) {
                $item = Item::findOrFail($entry['id']);
                $price = $this->itemPriceForOrderType($item, $validated['order_type']);
                $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

                $order->items()->create([
                    'item_id'          => $item->id,
                    'item_name'        => $item->name,
                    'is_custom_item'   => false,
                    'quantity'         => $entry['quantity'],
                    'price'            => $price,
                    'notes'            => $notes !== '' ? $notes : null,
                    'orderItem_status' => 'pending',
                    'source'           => 'new',
                ]);
            }

            foreach ($customItems as $entry) {
                $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

                $order->items()->create([
                    'item_id'          => null,
                    'item_name'        => trim((string) $entry['name']),
                    'is_custom_item'   => true,
                    'quantity'         => (int) $entry['quantity'],
                    'price'            => (float) $entry['price'],
                    'notes'            => $notes !== '' ? $notes : null,
                    'orderItem_status' => 'pending',
                    'source'           => 'new',
                ]);
            }

            $this->recalcTotals($order);

            return $order;
        });

        $order->load(['user.customer', 'table', 'items.item']);
        broadcast(new OrderPlaced($order))->toOthers();

        return redirect()->route('orders.show', $order)->with('success', 'Order created successfully.');
    }

    public function show(Order $order)
    {
        $order->load(['user.customer', 'table', 'items.item']);

        return Inertia::render('orders/show', [
            'order' => $order,
        ]);
    }

    /**
     * Cancel a quantity of an order item (in whole or in part).
     * The line is never deleted — it's marked 'cancelled' so it stays
     * on the record and prints a cancellation ticket to the kitchen.
     */
    public function removeItem(Request $request, Order $order, OrderItem $orderItem)
    {
        if ($orderItem->order_id !== $order->id) {
            abort(404);
        }

        if ($orderItem->orderItem_status === 'cancelled') {
            return redirect()->back()->with('error', 'This item is already cancelled.');
        }

        $validated = $request->validate([
            'quantity' => 'nullable|integer|min:1',
        ]);

        $qtyToCancel = min($validated['quantity'] ?? $orderItem->quantity, $orderItem->quantity);



        if ($qtyToCancel >= $orderItem->quantity) {
            $orderItem->update(['orderItem_status' => 'cancelled']);
            $cancelledLine = $orderItem;
        } else {
            // Split off just the cancelled portion; the rest of the line stays active.
            $cancelledLine = $order->items()->create([
                'item_id'          => $orderItem->item_id,
                'item_name'        => $orderItem->item_name,
                'is_custom_item'   => $orderItem->is_custom_item,
                'quantity'         => $qtyToCancel,
                'price'            => $orderItem->price,
                'notes'            => $orderItem->notes,
                'orderItem_status' => 'cancelled',
                'source'           => $orderItem->source,
            ]);
            $orderItem->decrement('quantity', $qtyToCancel);
        }

        $this->recalcTotals($order);

        $order->load(['user.customer', 'table', 'items.item']);
        broadcast(new OrderItemsUpdated($order))->toOthers();

        $order->loadMissing('table');
        app(CreatePrintJobsForOrder::class)->createCancellationTickets($order, collect([$cancelledLine]));

        return redirect()->back()->with('success', 'Item cancelled.');
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

    public function processPayment(Request $request, Order $order)
    {
        $validated = $request->validate([
            'discount'                    => 'nullable|numeric|min:0',
            'payments'                    => 'required|array|min:1|max:2',
            'payments.*.payment_method'   => 'required|in:Cash,Visa,Master,Uber,Pickme,Bank_Transfer',
            'payments.*.amount'           => 'required|numeric|min:0',
            'payments.*.amount_tendered'  => 'nullable|numeric|min:0',
        ]);

        $payments = $validated['payments'];
        $discount = (float) ($validated['discount'] ?? $order->discount ?? 0);
        $expectedTotal = round(max(0, (float) $order->subtotal - $discount), 2);
        $sum = round(collect($payments)->sum(fn ($p) => (float) $p['amount']), 2);

        $tendered = null;
        $balance = null;

        if (count($payments) === 1) {
            $only = $payments[0];

            if ($only['payment_method'] === 'Cash') {
                $tendered = (float) ($only['amount_tendered'] ?? $only['amount']);

                if ($tendered < $expectedTotal) {
                    throw ValidationException::withMessages([
                        'payments' => 'Amount tendered is less than the total due (Rs. ' . number_format($expectedTotal, 2) . ').',
                    ]);
                }

                $balance = round($tendered - $expectedTotal, 2);
            } elseif (abs($sum - $expectedTotal) > 0.01) {
                throw ValidationException::withMessages([
                    'payments' => 'Payment amount must equal the order total (Rs. ' . number_format($expectedTotal, 2) . ').',
                ]);
            }
        } elseif (abs($sum - $expectedTotal) > 0.01) {
            throw ValidationException::withMessages([
                'payments' => 'Split payment amounts must add up to the order total (Rs. ' . number_format($expectedTotal, 2) . ').',
            ]);
        }

        DB::transaction(function () use ($order, $payments, $discount, $expectedTotal, $tendered, $balance) {
            $order->paymentSplits()->delete();

            foreach ($payments as $index => $p) {
                $isSingleCash = count($payments) === 1 && $index === 0 && $p['payment_method'] === 'Cash';

                $order->paymentSplits()->create([
                    'payment_method'   => $p['payment_method'],
                    'amount'           => $p['amount'],
                    'amount_tendered'  => $isSingleCash ? $tendered : null,
                    'balance_returned' => $isSingleCash ? $balance : null,
                ]);
            }

            $order->update([
                'discount'       => $discount,
                'total_price'    => $expectedTotal,
                'payment_status' => 'paid',
            ]);

            app(RewardService::class)->awardPoints($order);
        });

        $order->load(['user.customer', 'table', 'items.item', 'paymentSplits']);
        broadcast(new OrderStatusUpdated($order))->toOthers();

        return redirect()->back()->with('success', 'Payment recorded.');
    }

    public function updateItemStatus(Request $request, Order $order, OrderItem $orderItem)
    {
        $request->validate([
            'orderItem_status' => 'required|in:pending,preparing,ready,served,cancelled',
        ]);

        $previousStatus = $orderItem->orderItem_status;

        $orderItem->update(['orderItem_status' => $request->orderItem_status]);

        $orderTime = OrderTime::firstOrNew(['order_id' => $order->id, 'item_id' => $orderItem->item_id]);
        if ($request->orderItem_status === 'preparing') {
            $orderTime->cooking_time = Carbon::now();
        } elseif (in_array($request->orderItem_status, ['ready', 'served'])) {
            $orderTime->ready_time = Carbon::now();
        }
        $orderTime->save();

        broadcast(new OrderItemStatusUpdated($orderItem))->toOthers();

        // Print a cancellation notice only on the transition INTO cancelled —
        // avoids reprinting if something re-saves the same status.
        if ($request->orderItem_status === 'cancelled' && $previousStatus !== 'cancelled') {
            $order->loadMissing('table');
            app(CreatePrintJobsForOrder::class)->createCancellationTickets($order, collect([$orderItem]));
        }

        // Cancelled items don't count toward the order total — recalc whenever
        // a line moves into or out of 'cancelled'.
        if ($request->orderItem_status !== $previousStatus
            && ($request->orderItem_status === 'cancelled' || $previousStatus === 'cancelled')) {
            $this->recalcTotals($order);
        }

        return redirect()->back()->with('success', 'Item status updated.');
    }

    public function receipt($orderId)
    {
        $order = \App\Models\Order::with('items.item', 'table', 'user')->findOrFail($orderId);

        $servedBy = $order->user?->name ?? 'Staff';

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
            'printer'  => 'counter',
            'payload'  => $data,
        ]));

        return back();
    }

    public function silentPrint(Order $order)
    {
        $order->load(['user.customer', 'table', 'items.item']);

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
                    'date'         => $order->created_at->format('d-m-Y'),
                    'time'         => $order->created_at->format('h:i A'),
                    'counter'      => $counter->name ?? '01',
                    'customer_name' => $order->user?->customer?->first_name . ' ' . $order->user?->customer?->last_name,
                    'customer_contact' => $order->user?->customer?->phone_number,
                    'customer_address' => $order->user?->customer?->address,
                    'items'        => $order->items
                        ->where('orderItem_status', '!=', 'cancelled')
                        ->map(fn ($orderItem) => [
                            'name'     => $orderItem->item_name ?? $orderItem->item?->name ?? 'Unknown Item',
                            'quantity' => $orderItem->quantity,
                            'price'    => number_format((float) $orderItem->price, 2, '.', ''),
                        ])->values()->all(),
                    'sub_total'    => number_format((float) $order->total_price, 2, '.', ''),
                    'total_price'  => number_format((float) $order->total_price, 2, '.', ''),
                    'payment_method' => $order->paymentSplits->isNotEmpty()
                        ? $order->paymentSplits->pluck('payment_method')->implode(' + ')
                        : 'CASH',
                ],
                'status' => 'pending',
            ]);

            broadcast(new PrintJobCreated($printJob));

            return redirect()->back()->with('success', 'Receipt sent to printer.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Printer Error: ' . $e->getMessage());
        }
    }

    /**
     * Full order edit screen — order setup, customer, existing items,
     * payment, and adding new items, all in one place.
     */
    public function edit(Order $order)
    {
        $order->load(['user.customer', 'table', 'items.item', 'paymentSplits']);

        $categories = Category::with(['items' => fn($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $tables = Table::where('is_active', true)->orderBy('name')->get();

        $customers = User::where('type', 'customer')
            ->with('customer')
            ->orderBy('name')
            ->get()
            ->map(fn($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'phone' => $u->customer?->phone_number,
            ]);

        return Inertia::render('orders/edit', [
            'order'      => $order,
            'categories' => $categories,
            'tables'     => $tables,
            'customers'  => $customers,
        ]);
    }

    public function update(Request $request, Order $order)
    {
        \Log::info('orders.update: request received', [
            'order_id'  => $order->id,
            'user_id'   => auth()->id(),
            'user_type' => auth()->user()?->type,
            'payload'   => $request->all(),
        ]);

        try {
            if ($order->order_status === 'cancelled') {
                \Log::info('orders.update: aborted, order is cancelled', ['order_id' => $order->id]);
                abort(422, 'Cancelled orders cannot be edited.');
            }

            $validated = $request->validate([
                'order_type'     => 'required|in:dine_in,takeaway,delivery,uber,pickme',
                'payment_status' => 'required|in:pending,paid',
                'payment_method' => 'nullable|in:Cash,Visa,Master,Uber,Pickme,Bank_Transfer',
                'table_id'       => 'nullable|exists:tables,id',
                'user_id'        => 'nullable|exists:users,id',
                'customer_name'  => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'discount'       => 'nullable|numeric|min:0',

                'existing_items'             => 'nullable|array',
                'existing_items.*.id'        => 'required|exists:order_items,id',
                'existing_items.*.quantity'  => 'required|integer|min:0',
                'existing_items.*.notes'     => 'nullable|string|max:1000',
                'existing_items.*.name'      => 'nullable|string|max:255',
                'existing_items.*.price'     => 'nullable|numeric|min:0',

                'new_items'                  => 'nullable|array',
                'new_items.*.id'             => 'required|exists:items,id',
                'new_items.*.quantity'       => 'required|integer|min:1',
                'new_items.*.notes'          => 'nullable|string|max:1000',

                'new_custom_items'               => 'nullable|array',
                'new_custom_items.*.name'        => 'required|string|max:255',
                'new_custom_items.*.price'       => 'required|numeric|min:0',
                'new_custom_items.*.quantity'    => 'required|integer|min:1',
                'new_custom_items.*.notes'       => 'nullable|string|max:1000',
            ]);

            \Log::info('orders.update: validation passed', ['order_id' => $order->id, 'validated' => $validated]);

            if ($validated['order_type'] !== 'dine_in') {
                $validated['table_id'] = null;
            } elseif (empty($validated['table_id'])) {
                throw ValidationException::withMessages([
                    'table_id' => 'Please select a table for a dine-in order.',
                ]);
            }

            $userId = $validated['user_id'] ?? $order->user_id;

            if (! $userId &&  ! empty($validated['customer_phone'])) {
                $existingCustomer = Customer::where('phone_number', $validated['customer_phone'])->first();

                if ($existingCustomer) {
                    $userId = $existingCustomer->user_id;
                } else {
                    $newUser = DB::transaction(function () use ($validated) {
                        $user = User::create([
                            'name'     => $validated['customer_name'],
                            'email'    => 'guest_' . Str::random(10) . '@ceylontable.lk',
                            'password' => Str::random(20),
                            'type'     => 'customer',
                        ]);

                        Customer::create([
                            'user_id'      => $user->id,
                            'first_name'   => $validated['customer_name'],
                            'last_name'    => '',
                            'phone_number' => $validated['customer_phone'],
                        ]);

                        return $user;
                    });

                    $userId = $newUser->id;
                }
            }

            $newOrderItems = collect();
            $cancelledLines = collect();

            DB::transaction(function () use ($validated, $order, $userId, &$newOrderItems, &$cancelledLines) {
                $orderTypeChanged = $validated['order_type'] !== $order->order_type;

                $order->update([
                    'order_type' => $validated['order_type'],
                    'table_id'   => $validated['table_id'] ?? null,
                    'user_id'    => $userId,
                    'discount'   => (float) ($validated['discount'] ?? $order->discount),
                ]);

                foreach ($validated['existing_items'] ?? [] as $entry) {
                    $orderItem = OrderItem::where('id', $entry['id'])->where('order_id', $order->id)->first();

                    if (! $orderItem || $orderItem->orderItem_status === 'cancelled') {
                        continue;
                    }

                    $qty = (int) $entry['quantity'];

                    if ($qty <= 0) {
                        $orderItem->update(['orderItem_status' => 'cancelled']);
                        $cancelledLines->push($orderItem);
                        continue;
                    }

                    $updates = [
                        'quantity' => $qty,
                        'notes'    => isset($entry['notes']) && trim((string) $entry['notes']) !== ''
                            ? trim($entry['notes'])
                            : null,
                    ];

                    if ($orderItem->is_custom_item) {
                        if (isset($entry['name']) && trim((string) $entry['name']) !== '') {
                            $updates['item_name'] = trim($entry['name']);
                        }
                        if (isset($entry['price'])) {
                            $updates['price'] = (float) $entry['price'];
                        }
                    } elseif ($orderTypeChanged && $orderItem->item) {
                        $updates['price'] = $this->itemPriceForOrderType($orderItem->item, $validated['order_type']);
                    }

                    $orderItem->update($updates);
                }

                foreach ($validated['new_items'] ?? [] as $entry) {
                    $item = Item::findOrFail($entry['id']);
                    $price = $this->itemPriceForOrderType($item, $validated['order_type']);
                    $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

                    $created = $order->items()->create([
                        'item_id'          => $item->id,
                        'item_name'        => $item->name,
                        'is_custom_item'   => false,
                        'quantity'         => $entry['quantity'],
                        'price'            => $price,
                        'notes'            => $notes !== '' ? $notes : null,
                        'orderItem_status' => 'pending',
                        'source'           => 'new',
                    ]);
                    $created->setRelation('item', $item);
                    $newOrderItems->push($created);
                }

                foreach ($validated['new_custom_items'] ?? [] as $entry) {
                    $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

                    $created = $order->items()->create([
                        'item_id'          => null,
                        'item_name'        => trim($entry['name']),
                        'is_custom_item'   => true,
                        'quantity'         => (int) $entry['quantity'],
                        'price'            => (float) $entry['price'],
                        'notes'            => $notes !== '' ? $notes : null,
                        'orderItem_status' => 'pending',
                        'source'           => 'new',
                    ]);
                    $newOrderItems->push($created);
                }

                $this->recalcTotals($order);

                if ($validated['payment_status'] === 'paid' && ! empty($validated['payment_method'])) {
                    $order->paymentSplits()->delete();
                    $order->paymentSplits()->create([
                        'payment_method' => $validated['payment_method'],
                        'amount'         => $order->fresh()->total_price,
                    ]);
                    $order->update(['payment_status' => 'paid']);
                } else {
                    $order->paymentSplits()->delete();
                    $order->update(['payment_status' => 'pending']);
                }
            });

            \Log::info('orders.update: transaction committed', [
                'order_id'        => $order->id,
                'new_items_count' => $newOrderItems->count(),
            ]);

            $order->load(['user.customer', 'table', 'items.item']);
            broadcast(new OrderItemsUpdated($order))->toOthers();

            if ($cancelledLines->isNotEmpty()) {
                $order->loadMissing('table');
                app(CreatePrintJobsForOrder::class)->createCancellationTickets($order, $cancelledLines);
            }

            if ($newOrderItems->isNotEmpty()) {
                app(CreatePrintJobsForOrder::class)->createTicketJobs($order, $newOrderItems);
            }

            \Log::info('orders.update: redirecting to orders.show', ['order_id' => $order->id]);

            return redirect()->route('orders.show', $order)->with('success', 'Order updated.');

        } catch (ValidationException $e) {
            \Log::warning('orders.update: validation failed', [
                'order_id' => $order->id,
                'errors'   => $e->errors(),
            ]);
            throw $e;
        } catch (\Throwable $e) {
            \Log::error('orders.update: unexpected exception', [
                'order_id' => $order->id,
                'message'  => $e->getMessage(),
                'file'     => $e->getFile(),
                'line'     => $e->getLine(),
            ]);
            throw $e;
        }
    }

    /**
     * Quick "add items only" action, used e.g. from the order show page.
     * The full edit screen (edit()/update()) covers this plus everything else.
     */
    public function addItems(Request $request, Order $order)
    {
        $validated = $request->validate([
            'items'                    => 'nullable|array',
            'items.*.id'               => 'required|exists:items,id',
            'items.*.quantity'         => 'required|integer|min:1',
            'custom_items'             => 'nullable|array',
            'custom_items.*.name'      => 'required|string|max:255',
            'custom_items.*.price'     => 'required|numeric|min:0',
            'custom_items.*.quantity'  => 'required|integer|min:1',
            'custom_items.*.notes'     => 'nullable|string|max:1000',
        ]);

        $items = $validated['items'] ?? [];
        $customItems = $validated['custom_items'] ?? [];

        if (count($items) === 0 && count($customItems) === 0) {
            throw ValidationException::withMessages([
                'items' => 'Add at least one menu item or one-time item.',
            ]);
        }

        $newOrderItems = collect();

        foreach ($items as $entry) {
            $item = Item::with('category.counters')->findOrFail($entry['id']);
            $price = $this->itemPriceForOrderType($item, $order->order_type);

            $existing = $order->items()
                ->where('item_id', $item->id)
                ->where('orderItem_status', 'pending')
                ->where('source', 'new')
                ->first();

            if ($existing) {
                $existing->increment('quantity', $entry['quantity']);

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
                    'source'           => 'new',
                ]);
                $created->setRelation('item', $item);
                $newOrderItems->push($created);
            }
        }

        foreach ($customItems as $entry) {
            $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

            $created = $order->items()->create([
                'item_id'          => null,
                'item_name'        => trim((string) $entry['name']),
                'is_custom_item'   => true,
                'quantity'         => (int) $entry['quantity'],
                'price'            => (float) $entry['price'],
                'notes'            => $notes !== '' ? $notes : null,
                'orderItem_status' => 'pending',
                'source'           => 'new',
            ]);
            $newOrderItems->push($created);
        }

        $this->recalcTotals($order);

        $order->load(['user.customer', 'table', 'items.item']);
        broadcast(new OrderItemsUpdated($order))->toOthers();

        app(CreatePrintJobsForOrder::class)->createTicketJobs($order, $newOrderItems);

        return redirect()->route('orders.show', $order)->with('success', 'Items added to order.');
    }
}
