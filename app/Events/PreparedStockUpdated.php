<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PreparedStockUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $itemId;
    public int $quantity;
    /**
     * Create a new event instance.
     */
    public function __construct(int $itemId, int $quantity)
    {
        $this->itemId = $itemId;
        $this->quantity = $quantity;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return new Channel('orders');
    }

    public function broadcastAs(): string
    {
        return 'prepared-stock.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'item_id'  => $this->itemId,
            'quantity' => $this->quantity,
        ];
    }
}
