<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderItemsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Order $order) {}

    public function broadcastOn(): Channel
    {
        return new Channel('orders');
    }

    public function broadcastAs(): string
    {
        return 'order.items.updated';
    }

    public function broadcastWith(): array
    {
        $this->order->load('items.item', 'table');

        return [
            'order_id'     => $this->order->id,
            'order_number' => $this->order->order_number,
            'table_name'   => $this->order->table?->name ?? 'Table ' . $this->order->table_id,
            'table_id'     => $this->order->table_id,
            'total_price'  => $this->order->total_price,
            'items'        => $this->order->items->map(fn($i) => [
                'id'       => $i->id,        // ← ADD THIS: the actual OrderItem row ID
                'item_id'  => $i->item_id,
                'name'     => optional($i->item)->name,
                'quantity' => $i->quantity,
                'price'    => $i->price,
                'status'   => $i->orderItem_status ?? 'pending',
            ]),
        ];
    }
}
