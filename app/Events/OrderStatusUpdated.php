<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Order $order)
    {
        //
    }

    public function broadcastOn(): Channel
    {
        return new Channel('orders');
    }

    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    public function broadcastWith(): array
{
    $this->order->loadMissing(['items.item.category.counters', 'table']);

    $hasJuiceBarItems = $this->order->items->contains(function ($orderItem) {
        return $orderItem->item?->category?->counters?->contains(
            fn($counter) => strcasecmp($counter->name, 'Juice Bar') === 0
        );
    });

    return [
        'order_id'            => $this->order->id,
        'order_number'        => $this->order->order_number,
        'order_status'        => $this->order->order_status,
        'payment_status'      => $this->order->payment_status,
        'table_id'            => $this->order->table_id,
        'has_juice_bar_items' => $hasJuiceBarItems,
    ];
}
}
