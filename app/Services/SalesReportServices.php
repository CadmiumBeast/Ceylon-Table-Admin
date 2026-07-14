<?php

// app/Services/SalesReportService.php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Carbon\Carbon;

class SalesReportService
{
    public function generate(Carbon $from, Carbon $to): array
    {
        $orders = Order::whereBetween('created_at', [$from, $to])
            ->where('status', 'completed')
            ->get();

        $orderIds = $orders->pluck('id');

        $itemsSold = OrderItem::whereIn('order_id', $orderIds)
            ->selectRaw('item_name, SUM(quantity) as total_qty, SUM(quantity * price) as total_revenue')
            ->groupBy('item_name')
            ->orderByDesc('total_qty')
            ->get();

        $payments = Payment::whereIn('order_id', $orderIds)
            ->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('method')
            ->get()
            ->keyBy('method');

        $cash = $payments->get('cash')?->total ?? 0;
        $card = $payments->get('card')?->total ?? 0;

        return [
            'period' => [
                'from' => $from->toDateTimeString(),
                'to' => $to->toDateTimeString(),
            ],
            'summary' => [
                'total_orders' => $orders->count(),
                'gross_sales' => $orders->sum('total'),
                'cash_income' => $cash,
                'card_income' => $card,
                'other_income' => $payments->except(['cash', 'card'])->sum('total'),
                'average_order_value' => $orders->count() ? round($orders->sum('total') / $orders->count(), 2) : 0,
            ],
            'items_sold' => $itemsSold,
            'payment_breakdown' => $payments->values(),
        ];
    }
}
