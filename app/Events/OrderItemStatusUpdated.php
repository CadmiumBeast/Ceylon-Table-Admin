<?php

namespace App\Events;

use App\Models\OrderItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderItemStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public OrderItem $orderItem)
    {
        //
    }

    public function broadcastOn(): Channel
    {
        return new Channel('orders');
    }

    public function broadcastAs(): string
    {
        return 'order.item.status.updated';
    }

    public function broadcastWith(): array
    {
        $this->orderItem->loadMissing('item.category.counters');

        $isJuiceBarItem = $this->orderItem->item?->category?->counters?->contains(
            fn($counter) => strcasecmp($counter->name, 'Juice Bar') === 0
        ) ?? false;

        return [
            'order_item_id'       => $this->orderItem->id,
            'order_id'            => $this->orderItem->order_id,
            'item_id'             => $this->orderItem->item_id,
            'status'              => $this->orderItem->orderItem_status,
            'has_juice_bar_items' => $isJuiceBarItem,
        ];
    }
}
