<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    //Table
    public function getNotAvailableTables()
    {
        $tables = \App\Models\Table::where('is_available', false)->where('is_active', true)->get();
        return response()->json($tables);
    }
    public function getAvailableTables()
    {
        $tables = \App\Models\Table::where('is_available', true)->where('is_active', true)->get();
        return response()->json($tables);
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
            return response()->json($order, 201);

        }catch(\Exception $e){
            \Log::error($e->getMessage());
            return response()->json(['error' => 'An error occurred'], 500);
        }
    }
}
