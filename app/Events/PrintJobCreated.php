<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\PrintJob;


class PrintJobCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public PrintJob $printJob)
    {
        //
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): Channel
    {
        return new Channel('printers');
    }

    public function broadcastAs(): string
    {
        return 'print.job.created';
    }

    public function broadcastWith(): array
    {
        return [
            'print_job_id' => $this->printJob->id,
            'printer_ip'   => $this->printJob->printer_ip,
            'printer_port' => $this->printJob->printer_port,
            'payload'      => $this->printJob->payload,
        ];
    }
}
