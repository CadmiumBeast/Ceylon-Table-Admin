<?php

namespace App\Listeners;

use App\Events\PrintJobCreated;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use App\Events\OrderPlaced;
use App\Models\Counter;
use App\Models\PrintJob;

class CreatePrintJobsForOrder
{
    protected string $billCounterName = 'Takeaway Counter';
    protected string $fallbackCounterName = 'Kitchen';


    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(OrderPlaced $event): void
    {
        $order = $event->order;
        $order->loadMissing(['items.item.category.counters', 'table', 'user.customer']);

        $ticketableItems = $order->items->where('source', '!=', 'prepared');
        $this->createTicketJobs($order, $ticketableItems);

        $billCounter = Counter::whereRaw('LOWER(name) = ?', [strtolower($this->billCounterName)])->first();
        if ($billCounter) {
            $this->createJob($order, $billCounter, $order->items->all(), type: 'bill');
        }
    }

    public function createTicketJobs(Order $order, iterable $orderItems): void
    {
        $order->loadMissing(['user.customer']);

        $fallbackCounter = Counter::whereRaw('LOWER(name) = ?', [strtolower($this->fallbackCounterName)])->first();

        $itemsByCounter = [];

        foreach ($orderItems as $orderItem) {
            $counters = $orderItem->item?->category?->counters;

            if ($counters && $counters->isNotEmpty()) {
                foreach ($counters as $counter) {
                    $itemsByCounter[$counter->id]['counter'] = $counter;
                    $itemsByCounter[$counter->id]['items'][] = $orderItem;
                }
            } elseif ($fallbackCounter) {
                $itemsByCounter[$fallbackCounter->id]['counter'] = $fallbackCounter;
                $itemsByCounter[$fallbackCounter->id]['items'][] = $orderItem;
            }
        }

        foreach ($itemsByCounter as $group) {
            $this->createJob($order, $group['counter'], $group['items'], type: 'ticket');
        }
    }

    protected function createJob($order, Counter $counter, array $items, string $type): void
    {
        if (! $counter->printer_ip) {
            \Log::warning("Counter '{$counter->name}' has no printer_ip set — skipping print job.", ['order_id' => $order->id]);
            return;
        }

        $payload = [
            'type'         => $type, // 'ticket' or 'bill'
            'order_number' => $order->order_number,
            'order_type'   => $order->order_type,
            'table_name'   => $order->table?->name,
            'counter_name' => $counter->name,
            'customer_name' => $order->user?->customer?->name,
            'customer_contact' => $order->user?->customer?->phone_number,
            'customer_address' => $order->user?->customer?->address,
            'items'        => collect($items)->map(fn ($i) => [
                'name' => $i->item_name ?? $i->item?->name ?? 'Unknown Item',
                'quantity' => $i->quantity,
                'price'    => $i->price,
                'notes'    => $i->notes,
            ])->values(),
            'total_price'  => $type === 'bill' ? $order->total_price : null,
            'printed_at_request' => now()->toDateTimeString(),
        ];

        $printJob = PrintJob::create([
            'order_id'     => $order->id,
            'counter_id'   => $counter->id,
            'printer_ip'   => $counter->printer_ip,
            'printer_port' => $counter->printer_port,
            'payload'      => $payload,
            'status'       => 'pending',
        ]);

        broadcast(new PrintJobCreated($printJob));
    }
}
