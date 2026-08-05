<?php

namespace App\Http\Controllers;

use App\Services\DailySalesReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\Printer;
use App\Models\PrintJob;
use App\Models\Counter;
use App\Events\PrintJobCreated;


class SalesReportController extends Controller
{
    public function __construct(private DailySalesReportService $service) {}

    public function index(Request $request)
    {
        return Inertia::render('reports/sales', [
            'date' => $request->query('date', now()->format('Y-m-d')),
        ]);
    }

    public function data(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'type' => 'required|in:day_end,category,hourly,item',
        ]);

        $data = $this->buildData(Carbon::parse($validated['date']), $validated['type']);

        return response()->json(['type' => $validated['type'], 'data' => $data]);
    }

    public function print(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'type' => 'required|in:day_end,category,hourly,item',
        ]);

        $date = Carbon::parse($validated['date']);
        $type = $validated['type'];
        $data = $this->buildData($date, $type);

        $counter = Counter::where('name', 'Front Counter')->firstOrFail();

        $printJob = PrintJob::create([
            'counter_id'      => $counter->id,
            'interface_type'  => $counter->interface_type, // 'usb'
            'printer_name'    => $counter->printer_name,   // 'ReceiptPrinter'
            'printer_ip'      => $counter->printer_ip,      // null
            'printer_port'    => $counter->printer_port,    // null
            'payload'         => [
                'type'        => 'sales_report',
                'report_type' => $type,
                'date'        => $date->format('Y-m-d'),
                'title'       => match ($type) {
                    'day_end'  => 'Day End Sales',
                    'category' => 'Category Wise',
                    'hourly'   => 'Hourly Sales',
                    'item'     => 'Sales by Item',
                },
                'data' => $data,
            ],
            'status' => 'pending',
        ]);

        broadcast(new PrintJobCreated($printJob));

        return back()->with('success', 'Report sent to printer.');
    }

    private function buildData(Carbon $date, string $type)
    {
        return match ($type) {
            'day_end'  => $this->service->dayEnd($date),
            'category' => $this->service->categoryWise($date),
            'hourly'   => $this->service->hourlySales($date),
            'item'     => $this->service->itemWise($date),
        };
    }

    private function printToTerminal(Carbon $date, string $type, $data): void
    {
        // "ReceiptPrinter" must match your Windows printer share name
        $connector = new WindowsPrintConnector("ReceiptPrinter");
        $printer = new Printer($connector);

        $titles = [
            'day_end'  => 'Day End Sales',
            'category' => 'Category Wise',
            'hourly'   => 'Hourly Sales',
            'item'     => 'Sales by Item',
        ];

        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->setTextSize(2, 2);
        $printer->text("Ceylon Table\n");
        $printer->setTextSize(1, 1);
        $printer->text($titles[$type] . "\n");
        $printer->text($date->format('d M Y') . "\n");
        $printer->text("Printed: " . now()->format('d M Y H:i') . "\n");
        $printer->text(str_repeat("-", 32) . "\n");
        $printer->setJustification(Printer::JUSTIFY_LEFT);

        match ($type) {
            'day_end'  => $this->printDayEnd($printer, $data),
            'category' => $this->printRows($printer, $data, 'category'),
            'item'     => $this->printRows($printer, $data, 'item_name'),
            'hourly'   => $this->printHourly($printer, $data),
        };

        $printer->text(str_repeat("-", 32) . "\n");
        $printer->setJustification(Printer::JUSTIFY_CENTER);
        $printer->text("End of report\n");
        $printer->feed(3);
        $printer->cut();
        $printer->close();
    }

    private function printDayEnd(Printer $printer, array $data): void
    {
        $line = fn ($label, $value) => $printer->text(
            str_pad($label, 20) . str_pad($value, 12, ' ', STR_PAD_LEFT) . "\n"
        );

        $line('Total Orders', $data['total_orders'] ?? 0);
        $line('Gross Sales', number_format($data['gross_sales'] ?? 0, 2));

        if (($data['total_discount'] ?? 0) > 0) {
            $line('Discounts', number_format($data['total_discount'], 2));
        }

        $line('Cash', number_format($data['cash'] ?? 0, 2));
        $line('Visa', number_format($data['Visa'] ?? 0, 2));
        $line('Master', number_format($data['Master'] ?? 0, 2));
        $line('Uber', number_format($data['Uber'] ?? 0, 2));
        $line('Pickme', number_format($data['Pickme'] ?? 0, 2));

        if (($data['other'] ?? 0) > 0) {
            $line('Other', number_format($data['other'], 2));
        }

        $line('Avg Order Value', number_format($data['average_order_value'] ?? 0, 2));

        $printer->setTextSize(1, 2);
        $line('NET SALES', number_format($data['net_sales'] ?? 0, 2));
        $printer->setTextSize(1, 1);
    }

    private function printRows(Printer $printer, $rows, string $labelKey): void
    {
        if ($rows->isEmpty()) {
            $printer->text("No data for this day.\n");
            return;
        }

        foreach ($rows as $row) {
            $printer->text($row[$labelKey] . "\n");
            $printer->text(
                "  Qty: " . str_pad($row['qty_sold'], 6)
                . "Rev: " . number_format($row['revenue'], 2) . "\n"
            );
        }
    }

    private function printHourly(Printer $printer, $rows): void
    {
        if ($rows->isEmpty()) {
            $printer->text("No sales this day.\n");
            return;
        }

        foreach ($rows as $row) {
            $printer->text(
                str_pad($row['hour'], 8)
                . str_pad($row['orders'] . ' ord', 10)
                . str_pad(number_format($row['total_sales'], 2), 10, ' ', STR_PAD_LEFT)
                . "\n"
            );
        }
    }
}
