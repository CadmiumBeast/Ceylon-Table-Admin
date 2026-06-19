<?php

namespace App\Events;

use App\Models\OrderItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderItemStatusUpdated implements ShouldBroadcast
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
        return [
            'order_item_id' => $this->orderItem->id,
            'order_id'      => $this->orderItem->order_id,
            'item_id'       => $this->orderItem->item_id,
            'status'        => $this->orderItem->orderItem_status,
        ];
    }
}
