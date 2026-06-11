<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();

        $stats = [
            'total_orders_today' => Order::whereDate('updated_at', $today)->count(),
            'revenue_today' => (float) Order::whereDate('updated_at', $today)
                ->where('payment_status', 'paid')
                ->sum('total_price'),
            'active_carts' => Cart::whereHas('items')->count(),
            'pending_orders' => Order::where('order_status', 'pending')->count(),
            'total_orders' => Order::count(),
            'completed_orders_today' => Order::whereDate('updated_at', $today)
                ->where('order_status', 'completed')
                ->count(),
            'total_revenue' => (float) Order::where('payment_status', 'paid')->sum('total_price'),
        ];

        $currentOrders = Order::with(['user', 'table', 'items.item'])
            ->whereNotIn('order_status', ['completed', 'cancelled'])
            ->orderByDesc('updated_at')
            ->get();

        return inertia('dashboard', [
            'stats' => $stats,
            'currentOrders' => $currentOrders,
        ]);
    }
}
