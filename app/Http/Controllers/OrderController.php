<?php

namespace App\Http\Controllers;

use App\Events\OrderItemStatusUpdated;
use App\Events\OrderPlaced;
use App\Events\OrderStatusUpdated;
use App\Events\PreparedStockUpdated;
use App\Events\PrintJobCreated;
use App\Models\Category;
use App\Models\Counter;
use App\Models\Customer;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderTime;
use App\Models\PreparedItem;
use App\Models\PreparedItemLog;
use App\Models\PrintJob;
use App\Models\Table;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
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
            ->where('order_status', '!=', 'cancelled')
            ->where(function ($query) {
                $query->where('order_status', '!=', 'completed')
                    ->orWhere('payment_status', '!=', 'paid');
            })
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('orders/index', [
            'orders' => $orders,
        ]);
    }

    public function indexCompleted()
    {
        $orders = Order::with(['user', 'table', 'items.item'])
            ->where('order_status', 'completed')
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

        $preparedStock = PreparedItem::where('quantity', '>', 0)
            ->get(['item_id', 'item_name', 'quantity'])
            ->keyBy('item_id');

        return Inertia::render('orders/create', [
            'categories'    => $categories,
            'tables'        => $tables,
            'customers'     => $customers,
            'preparedStock' => $preparedStock,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_type'     => 'required|in:dine_in,takeaway,delivery',
            'table_id'       => 'nullable|exists:tables,id',
            'user_id'        => 'nullable|exists:users,id',
            'customer_name'  => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'payment_method' => 'nullable|string|max:100',
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

        $lastOrder = Order::orderBy('id', 'desc')->first();
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
                'payment_method' => $validated['payment_method'] ?? null,
                'user_id'        => $userId,
                'table_id'       => $validated['table_id'] ?? null,
                'subtotal'       => 0,
                'discount'       => $discount,
                'total_price'    => 0,
            ]);

            $subtotal = 0;

            foreach ($items as $entry) {
                $item = Item::findOrFail($entry['id']);
                $price = $this->itemPriceForOrderType($item, $validated['order_type']);
                $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;
                $requestedQty = $entry['quantity'];
                $subtotal += $price * $requestedQty;

                // Serve from Prepared stock first — no kitchen wait for that portion.
                $consumedQty = $this->consumeFromPrepared($item->id, $requestedQty, $order);
                $remainingQty = $requestedQty - $consumedQty;

                if ($consumedQty > 0) {
                    $order->items()->create([
                        'item_id'          => $item->id,
                        'item_name'        => $item->name,
                        'is_custom_item'   => false,
                        'quantity'         => $consumedQty,
                        'price'            => $price,
                        'notes'            => $notes !== '' ? $notes : null,
                        'orderItem_status' => 'ready',
                        'source'           => 'prepared',
                    ]);
                }

                if ($remainingQty > 0) {
                    $order->items()->create([
                        'item_id'          => $item->id,
                        'item_name'        => $item->name,
                        'is_custom_item'   => false,
                        'quantity'         => $remainingQty,
                        'price'            => $price,
                        'notes'            => $notes !== '' ? $notes : null,
                        'orderItem_status' => 'pending',
                        'source'           => 'new',
                    ]);
                }
            }

            foreach ($customItems as $entry) {
                $name = trim((string) $entry['name']);
                $price = (float) $entry['price'];
                $quantity = (int) $entry['quantity'];
                $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

                $subtotal += $price * $quantity;

                $order->items()->create([
                    'item_id'          => null,
                    'item_name'        => $name,
                    'is_custom_item'   => true,
                    'quantity'         => $quantity,
                    'price'            => $price,
                    'notes'            => $notes !== '' ? $notes : null,
                    'orderItem_status' => 'pending',
                    'source'           => 'new',
                ]);
            }

            $order->update([
                'subtotal'    => $subtotal,
                'total_price' => max(0, $subtotal - $order->discount),
            ]);

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

    public function removeItem(Request $request, Order $order, OrderItem $orderItem)
    {
        if ($orderItem->order_id !== $order->id) {
            abort(404);
        }

        $validated = $request->validate([
            'quantity' => 'nullable|integer|min:1',
        ]);

        $qtyToRemove = min($validated['quantity'] ?? $orderItem->quantity, $orderItem->quantity);

        // Only items that were actually cooked (preparing/ready) are worth saving —
        // an item still 'pending' was never made, so there's nothing to hold onto.
        $eligibleForPrepared = ! $orderItem->is_custom_item
        && $orderItem->item_id !== null;

        if ($eligibleForPrepared) {
            $this->saveAsPrepared($orderItem, $qtyToRemove);
        }

        if ($qtyToRemove >= $orderItem->quantity) {
            $orderItem->delete();
        } else {
            $orderItem->decrement('quantity', $qtyToRemove);
        }

        $order->load('items');
        $subtotal = $order->items->sum(fn($oi) => $oi->price * $oi->quantity);
        $order->update([
            'subtotal'    => $subtotal,
            'total_price' => max(0, $subtotal - $order->discount),
        ]);

        $order->load(['user.customer', 'table', 'items.item']);
        broadcast(new OrderItemsUpdated($order))->toOthers();

        return redirect()->back()->with('success', $eligibleForPrepared
            ? 'Item removed and saved as prepared stock.'
            : 'Item removed.');
    }

    protected function saveAsPrepared(OrderItem $item, int $qty): void
    {
        $prepared = PreparedItem::firstOrNew(['item_id' => $item->item_id]);
        $prepared->item_name = $item->item_name ?? $item->item?->name ?? 'Unknown Item';
        $prepared->price = $item->price;
        $prepared->quantity = ($prepared->quantity ?? 0) + $qty;
        $prepared->oldest_prepared_at ??= now();
        $prepared->save();

        PreparedItemLog::create([
            'item_id'         => $item->item_id,
            'action'          => 'added',
            'quantity'        => $qty,
            'source_order_id' => $item->order_id,
        ]);

        broadcast(new PreparedStockUpdated($item->item_id, $prepared->quantity))->toOthers();
    }

    protected function consumeFromPrepared(int $itemId, int $requestedQty, Order $order): int
    {
        return DB::transaction(function () use ($itemId, $requestedQty, $order) {
            $prepared = PreparedItem::where('item_id', $itemId)->lockForUpdate()->first();

            if (! $prepared || $prepared->quantity <= 0) {
                return 0;
            }

            $consumed = min($prepared->quantity, $requestedQty);
            $prepared->quantity -= $consumed;

            if ($prepared->quantity <= 0) {
                $prepared->delete();
            } else {
                $prepared->save();
            }

            PreparedItemLog::create([
                'item_id'         => $itemId,
                'action'          => 'consumed',
                'quantity'        => $consumed,
                'target_order_id' => $order->id,
            ]);

            broadcast(new PreparedStockUpdated($itemId, max(0, $prepared->quantity ?? 0)))->toOthers();

            return $consumed;
        });
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
            'payment_method' => 'nullable|string|in:Cash,Visa,Bank_Transfer,Master,Uber,Pickme', // Added validation
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
                    // Add dynamic date and time based on the order's creation
                    'date'         => $order->created_at->format('d-m-Y'),
                    'time'         => $order->created_at->format('h:i A'),
                    'counter'      => $counter->name ?? '01',
                    'customer_name' => $order->user->customer->name,
                    'customer_contact' => $order->user?->customer?->contact_number ,
                    'customer_address' => $order->user?->customer?->address ,
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
        $order->load(['user.customer', 'table', 'items.item']);

        $categories = Category::with(['items' => fn($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $preparedItems = PreparedItem::where('quantity', '>', 0)
            ->get(['item_id', 'item_name', 'quantity'])
            ->keyBy('item_id');

        return Inertia::render('orders/edit', [
            'order'          => $order,
            'categories'     => $categories,
            'preparedStock'  => $preparedItems, // { [item_id]: { quantity, item_name } }
        ]);
    }

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
            $requestedQty = $entry['quantity'];

            // Serve from Prepared stock first — no kitchen ticket for that portion.
            $consumedQty = $this->consumeFromPrepared($item->id, $requestedQty, $order);
            $remainingQty = $requestedQty - $consumedQty;

            if ($consumedQty > 0) {
                $existingPrepared = $order->items()
                    ->where('item_id', $item->id)
                    ->where('source', 'prepared')
                    ->first();

                if ($existingPrepared) {
                    $existingPrepared->increment('quantity', $consumedQty);
                } else {
                    $order->items()->create([
                        'item_id'          => $item->id,
                        'item_name'        => $item->name,
                        'is_custom_item'   => false,
                        'quantity'         => $consumedQty,
                        'price'            => $price,
                        'orderItem_status' => 'ready',
                        'source'           => 'prepared',
                    ]);
                }
            }

            if ($remainingQty > 0) {
                $existing = $order->items()
                    ->where('item_id', $item->id)
                    ->where('orderItem_status', 'pending')
                    ->where('source', 'new')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity', $remainingQty);

                    $ticketLine = (clone $existing)->setRelation('item', $item);
                    $ticketLine->quantity = $remainingQty;
                    $newOrderItems->push($ticketLine);
                } else {
                    $created = $order->items()->create([
                        'item_id'          => $item->id,
                        'item_name'        => $item->name,
                        'is_custom_item'   => false,
                        'quantity'         => $remainingQty,
                        'price'            => $price,
                        'orderItem_status' => 'pending',
                        'source'           => 'new',
                    ]);
                    $created->setRelation('item', $item);
                    $newOrderItems->push($created);
                }
            }
        }

        // One-time / custom items always get their own new line — there's no
        // catalog item to match or fulfil from Prepared stock against.
        foreach ($customItems as $entry) {
            $name = trim((string) $entry['name']);
            $price = (float) $entry['price'];
            $quantity = (int) $entry['quantity'];
            $notes = isset($entry['notes']) ? trim((string) $entry['notes']) : null;

            $created = $order->items()->create([
                'item_id'          => null,
                'item_name'        => $name,
                'is_custom_item'   => true,
                'quantity'         => $quantity,
                'price'            => $price,
                'notes'            => $notes !== '' ? $notes : null,
                'orderItem_status' => 'pending',
                'source'           => 'new',
            ]);
            $newOrderItems->push($created);
        }

        $order->load('items');
        $subtotal = $order->items->sum(fn($oi) => $oi->price * $oi->quantity);

        $order->update([
            'subtotal'    => $subtotal,
            'total_price' => max(0, $subtotal - $order->discount),
        ]);

        $order->load(['user.customer', 'table', 'items.item']);
        broadcast(new OrderItemsUpdated($order))->toOthers();

        app(CreatePrintJobsForOrder::class)->createTicketJobs($order, $newOrderItems);

        return redirect()->route('orders.show', $order)->with('success', 'Items added to order.');
    }
}
