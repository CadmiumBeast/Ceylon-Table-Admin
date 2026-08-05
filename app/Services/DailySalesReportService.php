<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Carbon;

class DailySalesReportService
{
    protected function baseQuery(Carbon $date)
    {
        return Order::whereDate('created_at', $date)
            ->where('order_status', 'completed');
    }

    public function dayEnd(Carbon $date): array
    {
        $orders = $this->baseQuery($date)->get();
        $paymentMethods = $orders->groupBy(fn ($order) => strtolower((string) $order->payment_method));
        $methodTotal = fn (string $method) => round(
            $paymentMethods->get($method, collect())->sum('total_price'),
            2
        );

        return [
            'total_orders'        => $orders->count(),
            'gross_sales'         => round($orders->sum('subtotal'), 2),
            'total_discount'      => round($orders->sum('discount'), 2),
            'net_sales'           => round($orders->sum('total_price'), 2),
            'cash'                => $methodTotal('cash'),
            'Visa'                => $methodTotal('visa'),
            'Master'              => $methodTotal('master'),
            'Uber'                => $methodTotal('uber'),
            'Pickme'              => $methodTotal('pickme'),
            'other'               => round(
                $orders->reject(fn ($order) => in_array(
                    strtolower((string) $order->payment_method),
                    ['cash', 'visa', 'master', 'uber', 'pickme'],
                    true
                ))->sum('total_price'),
                2
            ),
            'average_order_value' => $orders->count()
                ? round($orders->sum('total_price') / $orders->count(), 2)
                : 0,
        ];
    }

    public function categoryWise(Carbon $date)
    {
        return $this->baseQuery($date)
            ->with('items.item.category')
            ->get()
            ->flatMap(fn ($order) => $order->items)
            ->groupBy(fn ($orderItem) => $orderItem->item?->category?->name ?? 'Uncategorized')
            ->map(fn ($items, $category) => [
                'category' => $category,
                'qty_sold' => $items->sum('quantity'),
                'revenue'  => round($items->sum(fn ($i) => $i->quantity * $i->price), 2),
            ])
            ->sortByDesc('revenue')
            ->values();
    }

    public function hourlySales(Carbon $date)
    {
        return $this->baseQuery($date)
            ->get()
            ->groupBy(fn ($order) => $order->created_at->format('H:00'))
            ->map(fn ($orders, $hour) => [
                'hour'        => $hour,
                'orders'      => $orders->count(),
                'total_sales' => round($orders->sum('total_price'), 2),
            ])
            ->sortKeys()
            ->values();
    }

    public function itemWise(Carbon $date)
    {
        return $this->baseQuery($date)
            ->with('items.item')
            ->get()
            ->flatMap(fn ($order) => $order->items)
            ->groupBy(fn ($orderItem) => $orderItem->item?->name ?? 'Unknown Item')
            ->map(fn ($items, $name) => [
                'item_name' => $name,
                'qty_sold'  => $items->sum('quantity'),
                'revenue'   => round($items->sum(fn ($i) => $i->quantity * $i->price), 2),
            ])
            ->sortByDesc('qty_sold')
            ->values();
    }
}
