<?php


namespace App\Services;

use App\Models\Order;
use App\Models\Shift;

class ShiftReportService
{
    protected function baseQuery(Shift $shift)
    {
        $from = $shift->opened_at;
        $to = $shift->closed_at ?? now(); // still-open shift runs up to "now"

        return Order::whereBetween('created_at', [$from, $to]) // swap to order_time if that's your column
            ->where('order_status', 'completed');
    }

    public function totalSales(Shift $shift): array
    {
        $orders = $this->baseQuery($shift)->get();

        return [
            'total_orders' => $orders->count(),
            'gross_sales' => $orders->sum('subtotal'),
            'total_discount' => $orders->sum('discount'),
            'net_sales' => $orders->sum('total_price'),
            'cash' => $orders->where('payment_method', 'cash')->sum('total_price'),
            'card' => $orders->where('payment_method', 'card')->sum('total_price'),
            'other' => $orders->whereNotIn('payment_method', ['cash', 'card'])->sum('total_price'),
            'average_order_value' => $orders->count() ? round($orders->sum('total_price') / $orders->count(), 2) : 0,
        ];
    }

    public function categoryWise(Shift $shift)
    {
        return $this->baseQuery($shift)
            ->with('items.item.category')
            ->get()
            ->flatMap(fn ($order) => $order->items)
            ->groupBy(fn ($item) => $item->item?->category?->name ?? 'Uncategorized')
            ->map(fn ($items, $category) => [
                'category' => $category,
                'qty_sold' => $items->sum('quantity'),
                'revenue' => $items->sum(fn ($i) => $i->quantity * $i->price),
            ])
            ->values();
    }

    public function discountWise(Shift $shift)
    {
        $orders = $this->baseQuery($shift)->where('discount', '>', 0)
            ->with('table')
            ->get();

        return [
            'total_discount_given' => $orders->sum('discount'),
            'discounted_orders_count' => $orders->count(),
            'orders' => $orders->map(fn ($o) => [
                'order_number' => $o->order_number,
                'table' => $o->table?->name,
                'subtotal' => $o->subtotal,
                'discount' => $o->discount,
                'total' => $o->total_price,
            ]),
        ];
    }

    public function tableWise(Shift $shift)
    {
        return $this->baseQuery($shift)
            ->with('table')
            ->get()
            ->groupBy(fn ($o) => $o->table?->name ?? 'No Table (Takeaway/Delivery)')
            ->map(fn ($orders, $table) => [
                'table' => $table,
                'orders' => $orders->count(),
                'total_sales' => $orders->sum('total_price'),
            ])
            ->values();
    }

    // waiterWise() removed until we settle how staff are tracked

    public function itemWise(Shift $shift)
    {
        return $this->baseQuery($shift)
            ->with('items')
            ->get()
            ->flatMap(fn ($order) => $order->items)
            ->groupBy('item_name') // adjust to your OrderItem schema
            ->map(fn ($items, $name) => [
                'item_name' => $name,
                'qty_sold' => $items->sum('quantity'),
                'revenue' => $items->sum(fn ($i) => $i->quantity * $i->price),
            ])
            ->sortByDesc('qty_sold')
            ->values();
    }

    public function orderWise(Shift $shift)
    {
        return $this->baseQuery($shift)
            ->with(['table', 'items'])
            ->orderBy('created_at')
            ->get()
            ->map(fn ($o) => [
                'order_number' => $o->order_number,
                'time' => $o->created_at->format('H:i'),
                'order_type' => $o->order_type,
                'table' => $o->table?->name,
                'items_count' => $o->items->count(),
                'subtotal' => $o->subtotal,
                'discount' => $o->discount,
                'total' => $o->total_price,
                'payment_method' => $o->payment_method,
            ]);
    }

    public function hourlySales(Shift $shift)
    {
        return $this->baseQuery($shift)
            ->get()
            ->groupBy(fn ($o) => $o->created_at->format('H:00'))
            ->map(fn ($orders, $hour) => [
                'hour' => $hour,
                'orders' => $orders->count(),
                'total_sales' => $orders->sum('total_price'),
            ])
            ->sortKeys()
            ->values();
    }
}
