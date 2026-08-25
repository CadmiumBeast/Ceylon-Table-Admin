<?php

namespace App\Listeners;

use App\Events\PrintJobCreated;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use App\Events\OrderPlaced;
use App\Models\Counter;
use App\Models\PrintJob;
use Illuminate\Support\Collection;

class CreatePrintJobsForOrder
{
    // The bill/receipt goes here — set this counter's interface_type to 'usb'
    protected string $billCounterName = 'Receipt';

    // Station-specific ticket for items whose category maps to it
    protected string $fallbackCounterName = 'Kitchen';

    // Master/expo ticket — gets EVERY item, regardless of category
    protected string $masterCounterName = 'Kitchen 2';

    public function __construct()
    {
        //
    }

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

    /**
     * Public entry point — called both from handle() above and directly
     * from OrderController::addItems() when items are added after the
     * order was originally placed.
     *
     * Sends station tickets (Kitchen, Juice Bar, etc.) AND a master
     * ticket with ALL items to Kitchen 2.
     */
    public function createTicketJobs(Order $order, iterable $orderItems): void
    {
        $order->loadMissing(['user.customer']);

        $items = collect($orderItems)->values();
        if ($items->isEmpty()) {
            return;
        }

        $this->routeToStationCounters($order, $items);
        $this->createMasterKitchenJob($order, $items);
    }

    protected function routeToStationCounters(Order $order, Collection $items): void
    {
        $fallbackCounter = Counter::whereRaw('LOWER(name) = ?', [strtolower($this->fallbackCounterName)])->first();

        $itemsByCounter = [];

        foreach ($items as $orderItem) {
            $counters = $orderItem->item?->category?->counters;

            if ($counters && $counters->isNotEmpty()) {
                foreach ($counters as $counter) {
                    // Kitchen 2 is handled separately as a master ticket with
                    // ALL items — skip it here to avoid double-adding.
                    if (strcasecmp($counter->name, $this->masterCounterName) === 0) {
                        continue;
                    }

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

    protected function createMasterKitchenJob(Order $order, Collection $items): void
    {
        $masterCounter = Counter::whereRaw('LOWER(name) = ?', [strtolower($this->masterCounterName)])->first();

        if (! $masterCounter) {
            \Log::warning("Master counter '{$this->masterCounterName}' not found — skipping master ticket.", ['order_id' => $order->id]);
            return;
        }

        $this->createJob($order, $masterCounter, $items->all(), type: 'ticket');
    }

    protected function createJob($order, Counter $counter, array $items, string $type): void
    {
        $isUsb = strtolower($counter->interface_type ?? 'network') === 'usb';

        if ($isUsb && ! $counter->printer_name) {
            \Log::warning("Counter '{$counter->name}' is USB but has no printer_name set — skipping print job.", ['order_id' => $order->id]);
            return;
        }

        if (! $isUsb && ! $counter->printer_ip) {
            \Log::warning("Counter '{$counter->name}' has no printer_ip set — skipping print job.", ['order_id' => $order->id]);
            return;
        }

        $payload = [
            'type'         => $type, // 'ticket' or 'bill'
            'order_number' => $order->order_number,
            'order_type'   => $order->order_type,
            'table_name'   => $order->table?->name,
            'counter_name' => $counter->name,
            'customer_name' => $order->user?->customer?->first_name,
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
            'order_id'       => $order->id,
            'counter_id'     => $counter->id,
            'interface_type' => $counter->interface_type,
            'printer_name'   => $counter->printer_name,
            'printer_ip'     => $counter->printer_ip,
            'printer_port'   => $counter->printer_port,
            'payload'        => $payload,
            'status'         => 'pending',
        ]);

        broadcast(new PrintJobCreated($printJob));
    }

    public function createCancellationTickets(Order $order, iterable $orderItems): void
    {
        $order->loadMissing(['table']);

        $items = collect($orderItems)->values();
        if ($items->isEmpty()) {
            return;
        }

        $fallbackCounter = Counter::whereRaw('LOWER(name) = ?', [strtolower($this->fallbackCounterName)])->first();
        $masterCounter = Counter::whereRaw('LOWER(name) = ?', [strtolower($this->masterCounterName)])->first();

        $itemsByCounter = [];

        foreach ($items as $orderItem) {
            $orderItem->loadMissing('item.category.counters');
            $counters = $orderItem->item?->category?->counters;

            if ($counters && $counters->isNotEmpty()) {
                foreach ($counters as $counter) {
                    if (strcasecmp($counter->name, $this->masterCounterName) === 0) {
                        continue; // added unconditionally below
                    }
                    $itemsByCounter[$counter->id]['counter'] = $counter;
                    $itemsByCounter[$counter->id]['items'][] = $orderItem;
                }
            } elseif ($fallbackCounter) {
                $itemsByCounter[$fallbackCounter->id]['counter'] = $fallbackCounter;
                $itemsByCounter[$fallbackCounter->id]['items'][] = $orderItem;
            }
        }

        foreach ($itemsByCounter as $group) {
            $this->createJob($order, $group['counter'], $group['items'], type: 'cancellation');
        }

        if ($masterCounter) {
            $this->createJob($order, $masterCounter, $items->all(), type: 'cancellation');
        }
    }
}
