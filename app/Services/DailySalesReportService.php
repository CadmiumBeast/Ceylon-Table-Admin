<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PaymentSplit;
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

    $splits = PaymentSplit::whereIn('order_id', $orders->pluck('id'))->get();
    $byMethod = $splits->groupBy(fn ($s) => strtolower(trim($s->payment_method)));
    $methodTotal = fn (string $method) => round($byMethod->get($method, collect())->sum('amount'), 2);


    $knownMethods = ['cash', 'visa', 'master', 'uber', 'pickme', 'bank_transfer'];


    return [
        'total_orders'        => $orders->count(),
        'gross_sales'         => round($orders->sum('subtotal'), 2),
        'total_discount'      => round($orders->sum('discount'), 2),
        'net_sales'           => round($orders->sum('total_price'), 2),
        'Cash'                => $methodTotal('cash'),
        'Visa'                => $methodTotal('visa'),
        'Master'              => $methodTotal('master'),
        'Uber'                => $methodTotal('uber'),
        'Pickme'              => $methodTotal('pickme'),
        'Bank_Transfer'       => $methodTotal('bank_transfer'),
        'other'               => round($splits->whereNotIn('payment_method', $knownMethods)->sum('amount'), 2),
        'average_order_value' => $orders->count()
            ? round($orders->sum('total_price') / $orders->count(), 2)
            : 0,
        'cancelled_orders'    => Order::whereDate('created_at', $date)
            ->where('order_status', 'cancelled')
            ->count(),
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
            ->groupBy(fn ($orderItem) => $orderItem->is_custom_item
                ? ($orderItem->item_name ?? 'Custom Item')
                : ($orderItem->item?->name ?? $orderItem->item_name ?? 'Unknown Item'))
            ->map(fn ($items, $name) => [
                'item_name' => $name,
                'qty_sold'  => $items->sum('quantity'),
                'revenue'   => round($items->sum(fn ($i) => $i->quantity * $i->price), 2),
            ])
            ->sortByDesc('qty_sold')
            ->values();
    }
}
