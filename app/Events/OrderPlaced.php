<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Order;

class OrderPlaced implements ShouldBroadcastNow
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
        return 'order.placed';
    }

    public function broadcastWith(): array
    {
        $this->order->loadMissing(['items.item.category.counters', 'table']);

        $hasJuiceBarItems = $this->order->items->contains(function ($orderItem) {
            return $orderItem->item?->category?->counters?->contains(function ($counter) {
                return strcasecmp($counter->name, 'Juice Bar') === 0;
            });
        });

        return [
            'order_id'      => $this->order->id,
            'order_number'  => $this->order->order_number,
            'order_status'  => $this->order->order_status,
            'order_type'    => $this->order->order_type,
            'table_name'    => $this->order->table?->name ?? 'Table ' . $this->order->table_id,
            'table_id'      => $this->order->table_id,
            'total_price'   => $this->order->total_price,
            'has_juice_bar_items' => $hasJuiceBarItems,
            'items'         => $this->order->items->map(fn($i) => [
                'id'       => $i->id,
                'item_id'  => $i->item_id,
                'name'     => optional($i->item)->name,
                'quantity' => $i->quantity,
                'price'    => $i->price,
                'status'   => $i->orderItem_status ?? 'pending',
            ]),
        ];
    }
}
