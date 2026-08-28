<?php
namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;

class OrderNumberService
{
    public function next(): string
    {
        $startOfLocalDay = now('Asia/Colombo')->startOfDay()->utc();

        // lockForUpdate to close the race-condition gap under concurrent requests
        $lastOrder = Order::where('created_at', '>=', $startOfLocalDay)
            ->orderBy('id', 'desc')
            ->lockForUpdate()
            ->first();

        $next = $lastOrder
            ? intval(str_replace('CTB-', '', $lastOrder->order_number)) + 1
            : 1;

        return 'CTB-' . str_pad($next, 6, '0', STR_PAD_LEFT);
    }
}
