<?php

namespace App\Http\Controllers\Api;

use App\Events\OrderItemStatusUpdated;
use App\Events\OrderPlaced;
use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderTime;
use App\Models\Table;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;




class ApiController extends Controller
{
    //User

    public function getDailyStats($userId)
    {
        $today = Carbon::today();

        \Log::info("Fetching daily stats for user ID: $userId on date: $today");

        // Count completed orders explicitly taken care of today by this specific user
        $completedOrdersCount = Order::where('user_id', $userId)
            ->whereDate('updated_at', $today)
            ->where('order_status', 'completed')
            ->count();

        // Sum complete gross revenue figures matching current daily shifts
        $totalSalesSum = Order::where('user_id', $userId)
            ->whereDate('updated_at', $today)
            ->where('payment_status', 'paid')
            ->sum('total_price');

        return response()->json([
            'completed_orders' => (int)$completedOrdersCount,
            'total_sales' => (float)$totalSalesSum
        ], 200);
    }
    //Table
    public function getNotAvailableTables()
    {
        try {
            $tables = \App\Models\Table::where('is_available', false)
                ->where('is_active', true)
                // 1. Only return tables that ACTUALLY have a pending order right now
                ->whereHas('orders', function ($query) {
                    $query->where('order_status', 'pending');
                })
                // 2. Eager-load the pending order AND its nested items relationship for Flutter
                ->with(['orders' => function ($query) {
                    $query->where('order_status', 'pending'); // Eager load the order items pivot and main food items table
                }])
                ->get();

            return response()->json($tables, 200);

        } catch (\Exception $e) {
            \Log::error('Error fetching in-use tables: ' . $e->getMessage());
            return response()->json(['error' => 'Something went wrong fetching table states'], 500);
        }
    }
    public function getAvailableTables()
    {
        $tables = \App\Models\Table::where('is_available', true)->where('is_active', true)->get();
        return response()->json($tables);
    }

    public function getTableDetails($tableId)
    {
        $table = \App\Models\Table::with(['orders' => function ($query) {
            $query->where('order_status', 'pending')->with('items');
        }])->find($tableId);

        if (!$table) {
            return response()->json(['error' => 'Table not found'], 404);
        }

        return response()->json($table, 200);
    }

    //Category
    public function getCategories()
    {
        $categories = \App\Models\Category::where('is_active', true)->get();
        return response()->json($categories);
    }


    //Item
    public function getItemsByCategory($categoryId)
    {
        $items = \App\Models\Item::where('category_id', $categoryId)->where('is_active', true)->get();
        return response()->json($items);
    }

    public function getAllItems()
    {
        $items = \App\Models\Item::where('is_active', true)->get();
        return response()->json($items);
    }

    // Cart
    public function addCartItem(Request $request)
    {
        try{
            $request->validate([
                'item_id' => 'required|exists:items,id',
                'quantity' => 'required|integer|min:1',
            ]);

            if (!$request->get('table_id')) {

                $cart = \App\Models\Cart::where('user_id', $request->user()->id)
                    ->whereNull('table_id')
                    ->first();

                if (!$cart) {
                    $cart = \App\Models\Cart::create([
                        'user_id' => $request->user()->id,
                        'table_id' => null,
                    ]);
                }

                $request->merge(['cart_id' => $cart->id]);
            }else{
                $cart = \App\Models\Cart::where('user_id', $request->user()->id)
                    ->where('table_id', $request->get('table_id'))
                    ->first();

                if (!$cart) {
                    $cart = \App\Models\Cart::create([
                        'user_id' => $request->user()->id,
                        'table_id' => $request->get('table_id'),
                    ]);
                }

                $request->merge(['cart_id' => $cart->id]);
            }

            $item = \App\Models\Item::find($request->get('item_id'));
            if (!$item || !$item->is_active || $item->quantity < $request->get('quantity')) {
                return response()->json(['error' => 'Item not found or not available'], 404);
            }

            $cartItem = \App\Models\CartItem::create([
                'cart_id' => $request->get('cart_id'),
                'item_id' => $request->get('item_id'),
                'quantity' => $request->get('quantity'),
            ]);

            $item->decrement('quantity', $request->get('quantity'));

            return response()->json($cartItem, 201);
        }catch(\Exception $e){
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }

    }

    public function removeCartItem(Request $request, $cartItemId)
    {
        $cartItem = \App\Models\CartItem::find($cartItemId);
        if (!$cartItem) {
            return response()->json(['error' => 'Cart item not found'], 404);
        }

        $item = $cartItem->item;
        if ($item) {
            $item->increment('quantity', $cartItem->quantity);
        }

        $cartItem->delete();

        return response()->json(['message' => 'Cart item removed']);
    }

    public function getCartItems(Request $request, $cartId)
    {
        $cartItems = \App\Models\CartItem::where('cart_id', $cartId)->with('item')->get();

        //Group cart items by item_id and sum quantities
        $groupedItems = $cartItems->groupBy('item_id')->map(function ($items) {
            return [
                'item_id' => $items->first()->item_id,
                'quantity' => $items->sum('quantity'),
                'item' => $items->first()->item,
            ];
        })->values();


        return response()->json($groupedItems);
    }

    //Order
    public function placeOrder(Request $request){
        try{
            $cart_id = $request->get('cart_id');
            $payment_method = $request->get('payment_method');
            $discount = $request->get('discount', 0);

            $total_price = 0;
            $subtotal = 0;

            $cart = \App\Models\Cart::find($cart_id);
            if (!$cart) {
                return response()->json(['error' => 'Cart not found'], 404);
            }

            //last order number
            $lastOrder = \App\Models\Order::orderBy('id', 'desc')->first();
            if ($lastOrder) {
                $lastOrderNumber = $lastOrder->order_number;
                $lastOrderNumber = str_replace('CTB-', '', $lastOrderNumber);
                $lastOrderNumber = intval($lastOrderNumber);
                $order_number = 'CTB-' . str_pad($lastOrderNumber + 1, 6, '0', STR_PAD_LEFT);
            } else {
                $order_number = 'CTB-000001';
            }


            $order = \App\Models\Order::create([
                'user_id' => $cart->user_id,
                'table_id' => $cart->table_id,
                'payment_method' => $payment_method,
                'payment_status' => 'pending',
                'discount' => $discount,
                'order_number' => $order_number,
                'order_type' => $cart->table_id ? 'dine-in' : 'takeaway',
                'total_price' => 0, // Will be updated later
                'subtotal' => 0, // Will be updated later
            ]);

            // Group cart items by item_id and sum quantities
            $groupedItems = $cart->items->groupBy('item_id')->map(function ($items) {
                return [
                    'item_id' => $items->first()->item_id,
                    'quantity' => $items->sum('quantity'),
                    'price' => $items->first()->item->price,
                ];
            })->values();

            foreach ($groupedItems as $groupedItem) {
                $total_price += $groupedItem['quantity'] * $groupedItem['price'];
                $subtotal += $groupedItem['quantity'] * $groupedItem['price'];
                \App\Models\OrderItem::create([
                    'order_id' => $order->id,
                    'item_id' => $groupedItem['item_id'],
                    'quantity' => $groupedItem['quantity'],
                    'price' => $groupedItem['price'],
                ]);
            }

            $total_price = $subtotal - $discount;

            $order->update([
                'total_price' => $total_price,
                'subtotal' => $subtotal,
            ]);

            $cart->items()->delete();
                if ($cart->table_id) {
                    $table = \App\Models\Table::find($cart->table_id);
                    if ($table) {
                        $table->update(['is_available' => false]);
                    }
                }

            OrderTime::create([
                'order_id' => $order->id,
                'item_id' => null,
                'ordered_time' => Carbon::now(),
            ]);

            $order->load('items.item', 'table');

            \Log::info('Broadcasting OrderPlaced', ['order_id' => $order->id]);
            broadcast(new OrderPlaced($order));

            return response()->json($order, 201);

        }catch(\Exception $e){
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }
    }

    public function updateOrderItems(Request $request, $orderId)
    {
        try {
            $order = \App\Models\Order::find($orderId);
            if (!$order) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            $items = $request->get('items', []);
            foreach ($items as $itemData) {
                $orderItem = \App\Models\OrderItem::where('order_id', $orderId)
                    ->where('item_id', $itemData['item_id'])
                    ->first();

                if ($orderItem) {
                    //Get the original quantity before update to adjust item stock
                    $originalQuantity = $orderItem->quantity;
                    $quantityDiff = $itemData['quantity'] - $originalQuantity;
                    $item = \App\Models\Item::find($itemData['item_id']);
                    if ($item) {
                        if ($quantityDiff < 0) {
                            $item->increment('quantity', abs($quantityDiff));
                        } elseif ($quantityDiff > 0) {
                            if ($item->quantity < $quantityDiff) {
                                return response()->json(['error' => 'Not enough stock for item ID ' . $itemData['item_id']], 400);
                            }
                            $item->decrement('quantity', $quantityDiff);
                        }
                    }
                    $orderItem->update([
                        'quantity' => $itemData['quantity'],
                    ]);
                }else{
                    $item = \App\Models\Item::find($itemData['item_id']);
                    if ($item) {
                        if ($item->quantity < $itemData['quantity']) {
                            return response()->json(['error' => 'Not enough stock for item ID ' . $itemData['item_id']], 400);
                        }
                        $item->decrement('quantity', $itemData['quantity']);
                    }

                    \App\Models\OrderItem::create([
                        'order_id' => $orderId,
                        'item_id' => $itemData['item_id'],
                        'quantity' => $itemData['quantity'],
                        'price' => $itemData['price'],
                    ]);
                }
            }

            // Recalculate order totals
            $subtotal = \App\Models\OrderItem::where('order_id', $orderId)->sum(\DB::raw('quantity * price'));
            $total_price = $subtotal - $order->discount;

            $order->update([
                'total_price' => $total_price,
                'subtotal' => $subtotal,
            ]);

            broadcast(new OrderStatusUpdated($order->fresh()))->toOthers();

            return response()->json(['message' => 'Order items updated']);
        } catch (\Exception $e) {
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }
    }

    public function closeOrder(Request $request, $orderId)
    {
        try {
            // Customer creation logic (name, phone, dbo)
            $user = User::create([
                'name' => $request->get('customer_first_name') . ' ' . $request->get('customer_last_name'),
                'email' => 'customer_' . time() . '@ceylontable.com', // Generate a unique email for the customer
                'password' => bcrypt('defaultpassword'),
            ]);


            $customer = \App\Models\Customer::firstOrCreate([
                'user_id' => $user->id,
                'first_name' => $request->get('customer_first_name'),
                'last_name' => $request->get('customer_last_name'),
                'phone_number' => $request->get('customer_phone'),
                'date_of_birth' => $request->get('customer_dbo'),
            ]);


            $order = \App\Models\Order::find($orderId);
            if (!$order) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            $payment_method = $request->get('payment_method');

            $order->update([
                'order_status' => 'completed',
                'payment_method' => $payment_method,
                'payment_status' => 'paid',
            ]);

            if ($order->table_id) {
                $table = \App\Models\Table::find($order->table_id);
                if ($table) {
                    $table->update(['is_available' => true]);
                }
            }

            broadcast(new OrderStatusUpdated($order->fresh()))->toOthers();

            return response()->json(['message' => 'Order closed successfully']);
        } catch (\Exception $e) {
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }
    }


    //Chef


    public function getDashboardData()
    {
        try{
            $today = Carbon::today();

            // 1. Calculate Dashboard Metrics
            $doneToday = Order::whereDate('updated_at', $today)
                ->where('order_status', 'completed')
                ->count();

            $avgPrepTime = (int) round(
                OrderTime::whereNotNull('cooking_time')
                    ->whereNotNull('ready_time')
                    ->whereDate('created_at', $today)
                    ->avg(DB::raw('TIMESTAMPDIFF(MINUTE, cooking_time, ready_time)')) ?? 0
            );
            $onTimePercentage = 95;    // Default target SLA speed index fallback

            $allitems = Item::all();

            // 2. Fetch Active Kitchen Queue (Pending or Currently Cooking orders)
            $orders = Order::with(['items', 'table'])
                ->whereIn('order_status', ['pending', 'cooking'])
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'table_name' => $order->table ? $order->table->name : 'Unassigned',
                        'status' => $order->order_status, // 'pending' maps to 'New' on frontend
                        'items' => $order->items->map(function ($item) {
                            return [
                                'item_id' => $item->item_id,
                                'name' => $item->item->name,
                                'quantity' => $item->quantity,
                                'status' => $item->orderItem_status, // 'pending' maps to 'New', 'cooking' to 'In Progress', 'ready' to 'Ready'
                            ];
                        })
                    ];
                });

            return response()->json([
                'stats' => [
                    'done_today' => (int)$doneToday,
                    'avg_prep_time' => (int)$avgPrepTime,
                    'on_time_percentage' => (int)$onTimePercentage,
                ],
                'orders' => $orders
            ], 200);
        }catch(\Exception $e){
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }

    }

    public function updateKitchenStatus(Request $request, $orderId)
    {
        try{
            $order = Order::find($orderId);
            if (!$order) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            $newStatus = $request->get('status');
            if (!in_array($newStatus, ['pending', 'cooking', 'ready'])) {
                return response()->json(['error' => 'Invalid status value'], 400);
            }

            $order->update(['order_status' => $newStatus]);

            $orderTime = OrderTime::firstOrNew(['order_id' => $order->id]);
            if ($newStatus === 'cooking') {
                $orderTime->cooking_time = Carbon::now();
            } elseif ($newStatus === 'ready') {
                $orderTime->ready_time = Carbon::now();
            }
            $orderTime->save();

            broadcast(new OrderStatusUpdated($order))->toOthers();

            return response()->json(['message' => 'Kitchen status updated successfully']);

        }catch(\Exception $e){
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }

    }

    public function getWeeklyStats()
    {
        $oneWeekAgo = Carbon::now()->subDays(7);

        // 1. Compile summary data metrics
        $totalOrdersCount = Order::where('created_at', '>=', $oneWeekAgo)
            ->where('order_status', 'completed')
            ->count();

        // 2. Aggregate peak hours distribution metrics via raw creation timestamps
        $peakHoursRaw = Order::select(DB::raw('HOUR(created_at) as hour'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', $oneWeekAgo)
            ->groupBy('hour')
            ->get();

        $maxHourCount = $peakHoursRaw->max('count') ?: 1;

        // Map operational target values into discrete segments to match frontend chart blocks
        $targetHoursList = [
            ['time' => '11am', 'start' => 11, 'end' => 12],
            ['time' => '1pm',  'start' => 13, 'end' => 14],
            ['time' => '3pm',  'start' => 15, 'end' => 16],
            ['time' => '5pm',  'start' => 17, 'end' => 18],
            ['time' => '7pm',  'start' => 19, 'end' => 20],
            ['time' => 'Now',  'start' => Carbon::now()->hour, 'end' => Carbon::now()->hour + 1],
        ];

        $peakHoursMapped = collect($targetHoursList)->map(function ($slot) use ($peakHoursRaw, $maxHourCount) {
            $matchingHour = $peakHoursRaw->firstWhere('hour', $slot['start']);
            $count = $matchingHour ? $matchingHour->count : 0;
            return [
                'time' => $slot['time'],
                'weight' => round($count / $maxHourCount, 2) // Outputs normalized value ranging 0.0 to 1.0
            ];
        });

        // 3. Extract top items sorted by highest transaction count
        $topOrdersMapped = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->select('items.name', DB::raw('SUM(order_items.quantity) as total_qty'))
            ->where('order_items.created_at', '>=', $oneWeekAgo)
            ->groupBy('items.id', 'items.name')
            ->orderBy('total_qty', 'desc')
            ->take(5)
            ->get()
            ->map(function ($row) {
                return [
                    'name' => $row->name,
                    'count' => (int)$row->total_qty
                ];
            });

        $avgTime = (int) round(
            OrderTime::whereNotNull('cooking_time')
                ->whereNotNull('ready_time')
                ->where('created_at', '>=', $oneWeekAgo)
                ->avg(DB::raw('TIMESTAMPDIFF(MINUTE, cooking_time, ready_time)')) ?? 0
        );

        return response()->json([
            'summary' => [
                'total_orders' => (int)$totalOrdersCount,
                'avg_time' => $avgTime,
                'rating' => 'A+'
            ],
            'peak_hours' => $peakHoursMapped,
            'top_orders' => $topOrdersMapped
        ], 200);
    }

    public function updateItemStatus(Request $request, $orderId,$itemId, )
    {
        try {
            $orderItem = \App\Models\OrderItem::where('order_id', $orderId)
                ->where('item_id', $itemId)
                ->first();

            if (!$orderItem) {
                return response()->json(['error' => 'Order item not found'], 404);
            }

            $newStatus = $request->get('status');
            if (!in_array($newStatus, ['pending', 'cooking', 'ready', 'served', 'cancelled'])) {
                return response()->json(['error' => 'Invalid status value'], 400);
            }

            $orderItem->update(['orderItem_status' => $newStatus]);

            // Mark the time when the item status was updated to 'cooking' or 'ready' for accurate kitchen time tracking
            $orderTime = OrderTime::firstOrNew(['order_id' => $orderId, 'item_id' => $itemId]);
            if ($newStatus === 'cooking') {
                $orderTime->cooking_time = Carbon::now();
            } elseif ($newStatus === 'ready') {
                $orderTime->ready_time = Carbon::now();
            }
            $orderTime->save();

            broadcast(new OrderItemStatusUpdated($orderItem))->toOthers();

            return response()->json(['message' => 'Item status updated successfully']);

        } catch (\Exception $e) {
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }
    }

    public function getReadyItems()
    {
        $readyItems = \App\Models\OrderItem::where('orderItem_status', 'ready')
            ->with(['item', 'order.table'])
            ->get()
            ->map(function ($item) {
                return [
                    'order_item_id' => $item->id,
                    'order_id' => $item->order_id,
                    'item_id' => $item->item_id,
                    'name' => $item->item->name,
                    'quantity' => $item->quantity,
                    'table_name' => $item->order->table ? $item->order->table->name : 'Unassigned',
                ];
            });

        return response()->json($readyItems, 200);
    }

    public function markItemAsServed(Request $request, $orderItemId)
    {
        try {
            $orderItem = \App\Models\OrderItem::find($orderItemId);
            if (!$orderItem) {
                return response()->json(['error' => 'Order item not found'], 404);
            }

            $orderItem->update(['orderItem_status' => 'served']);

            broadcast(new OrderItemStatusUpdated($orderItem))->toOthers();

            return response()->json(['message' => 'Item marked as served successfully']);

        } catch (\Exception $e) {
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }
    }


}
