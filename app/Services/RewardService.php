<?php

namespace App\Services;
use App\Models\Order;
use App\Models\Customer;
use Carbon\Carbon;

class RewardService
{
    public function awardPoints(Order $order): void
    {
        $customer = $order->user?->customer;
        if (!$customer) return;

        $points = (int) floor($order->total_price / 100); // Rs.100 = 1 point
        if ($points > 0) {
            $customer->increment('loyalty_points', $points);
        }
    }

    public function isBirthdayToday(Customer $customer): bool
    {
        if (!$customer->date_of_birth) return false;
        return Carbon::parse($customer->date_of_birth)->isSameDay(
            Carbon::now()->setYear(Carbon::parse($customer->date_of_birth)->year)
        );
        // simpler: compare month+day
    }
}
