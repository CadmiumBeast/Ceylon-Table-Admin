<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date',
        ]);

        $from = $this->parseBound($validated['date_from'] ?? null, endOfDay: false);
        $to   = $this->parseBound($validated['date_to'] ?? null, endOfDay: true);

        return Inertia::render('reports/summary', [
            'summary'   => $this->buildSummary($from, $to),
            'date_from' => $from->format('Y-m-d\TH:i'),
            'date_to'   => $to->format('Y-m-d\TH:i'),
        ]);
    }

    public function summaryPrint(Request $request)
    {
        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date',
        ]);

        $from = $this->parseBound($validated['date_from'] ?? null, endOfDay: false);
        $to   = $this->parseBound($validated['date_to'] ?? null, endOfDay: true);

        return view('reports.summary-print', [
            'summary'  => $this->buildSummary($from, $to),
            'dateFrom' => $from,
            'dateTo'   => $to,
        ]);
    }

    /**
     * Parses a date/datetime input. Date-only strings ("2026-07-15") snap to
     * the start or end of that day. Anything with a time component (from the
     * quick-hour buttons or a datetime-local picker) is used exactly as given.
     */
    private function parseBound(?string $value, bool $endOfDay): Carbon
    {
        if (!$value) {
            return $endOfDay ? now()->endOfDay() : now()->startOfDay();
        }

        $isDateOnly = preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1;
        $carbon = Carbon::parse($value);

        if ($isDateOnly) {
            return $endOfDay ? $carbon->endOfDay() : $carbon->startOfDay();
        }

        return $carbon;
    }

    private function buildSummary(Carbon $from, Carbon $to): array
    {
        $orders = Order::with(['items.item', 'table', 'user'])
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at')
            ->get();

        $itemBreakdown = [];
        foreach ($orders as $order) {
            foreach ($order->items as $orderItem) {
                if ($orderItem->orderItem_status === 'cancelled') {
                    continue;
                }
                $name = $orderItem->item?->name ?? 'Unknown Item';
                $itemBreakdown[$name] ??= ['name' => $name, 'quantity' => 0, 'total' => 0];
                $itemBreakdown[$name]['quantity'] += $orderItem->quantity;
                $itemBreakdown[$name]['total']    += $orderItem->price * $orderItem->quantity;
            }
        }
        $itemBreakdown = collect($itemBreakdown)->sortByDesc('quantity')->values()->all();

        $paymentBreakdown = $orders->groupBy(fn ($o) => $o->payment_method ?? 'unspecified')
            ->map(fn ($group, $method) => [
                'method' => $method,
                'count'  => $group->count(),
                'total'  => round($group->sum('total_price'), 2),
            ])->values()->all();

        $typeBreakdown = $orders->groupBy('order_type')
            ->map(fn ($group, $type) => [
                'type'  => $type,
                'count' => $group->count(),
                'total' => round($group->sum('total_price'), 2),
            ])->values()->all();

        $statusBreakdown = $orders->groupBy('order_status')
            ->map(fn ($group, $status) => [
                'status' => $status,
                'count'  => $group->count(),
            ])->values()->all();

        $paidOrders = $orders->where('payment_status', 'paid');

        return [
            'order_count'         => $orders->count(),
            'completed_count'     => $orders->where('order_status', 'completed')->count(),
            'cancelled_count'     => $orders->where('order_status', 'cancelled')->count(),
            'total_revenue'       => round($paidOrders->sum('total_price'), 2),
            'total_subtotal'      => round($orders->sum('subtotal'), 2),
            'total_discount'      => round($orders->sum('discount'), 2),
            'average_order_value' => $orders->count() > 0
                ? round($orders->sum('total_price') / $orders->count(), 2)
                : 0,
            'item_breakdown'      => $itemBreakdown,
            'payment_breakdown'   => $paymentBreakdown,
            'type_breakdown'      => $typeBreakdown,
            'status_breakdown'    => $statusBreakdown,
            'orders'              => $orders->map(fn ($o) => [
                'id'             => $o->id,
                'order_number'   => $o->order_number,
                'order_type'     => $o->order_type,
                'order_status'   => $o->order_status,
                'payment_status' => $o->payment_status,
                'payment_method' => $o->payment_method,
                'table'          => $o->table?->name,
                'customer'       => $o->user?->name,
                'subtotal'       => $o->subtotal,
                'discount'       => $o->discount,
                'total_price'    => $o->total_price,
                'created_at'     => $o->created_at,
            ]),
        ];
    }
}
