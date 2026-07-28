<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shift;
use Inertia\Inertia;
use App\Services\ShiftReportService;

class ShiftController extends Controller
{
    public function __construct(private ShiftReportService $service) {}

    public function index(Request $request)
    {
        $shiftId = $request->query('shift_id');
        $shift = $shiftId ? Shift::findOrFail($shiftId) : Shift::current();

        return Inertia::render('reports/shift',[
        'currentShift' => Shift::current(),
        'shifts' => Shift::orderByDesc('opened_at')->limit(30)->get([
            'id', 'opened_at', 'closed_at', 'status', 'opening_cash', 'closing_cash',
        ]),
        ]);
    }

    public function data(Request $request)
    {
        $validated = $request->validate([
            'shift_id' => 'required|exists:shifts,id',
            'type' => 'required|in:total,category,discount,table,item,order,hourly',
        ]);

        $shift = Shift::findOrFail($validated['shift_id']);

        $data = match ($validated['type']) {
            'total' => $this->service->totalSales($shift),
            'category' => $this->service->categoryWise($shift),
            'discount' => $this->service->discountWise($shift),
            'table' => $this->service->tableWise($shift),
            'item' => $this->service->itemWise($shift),
            'order' => $this->service->orderWise($shift),
            'hourly' => $this->service->hourlySales($shift),
        };

        return response()->json(['type' => $validated['type'], 'data' => $data]);
    }

    public function open(Request $request)
    {
        if (Shift::current()) {
            return back()->withErrors(['shift' => 'A shift is already open.']);
        }

        $validated = $request->validate([
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $shift = Shift::create([
            'opened_by' => auth()->id(),
            'opening_cash' => $validated['opening_cash'],
            'status' => 'open',
            'opened_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', "Shift #{$shift->id} opened.");
    }

    public function close(Request $request)
    {
        $shift = Shift::current();

        if (!$shift) {
            return back()->withErrors(['shift' => 'No open shift found.']);
        }

        $validated = $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $shift->update([
            'closed_by' => auth()->id(),
            'closing_cash' => $validated['closing_cash'],
            'status' => 'closed',
            'closed_at' => now(),
            'notes' => $validated['notes'] ?? $shift->notes,
        ]);

        return back()->with('success', "Shift #{$shift->id} closed.");
    }

    public function current()
    {
        return response()->json(['shift' => Shift::current()]);
    }
}
