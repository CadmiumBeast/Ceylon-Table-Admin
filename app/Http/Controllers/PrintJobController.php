<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PrintJob;

class PrintJobController extends Controller
{
    public function pending()
    {
        $jobs = PrintJob::where('status', 'pending')
            ->orderBy('created_at')
            ->get()
            ->map(fn (PrintJob $job) => [
                'print_job_id' => $job->id,
                'printer_ip'   => $job->printer_ip,
                'printer_port' => $job->printer_port,
                'payload'      => $job->payload,
            ]);

        return response()->json($jobs);
    }

    public function updateStatus(Request $request, PrintJob $printJob)
    {
        $validated = $request->validate([
            'status'     => 'required|in:sent,failed',
            'last_error' => 'nullable|string',
        ]);

        $printJob->update([
            'status'     => $validated['status'],
            'last_error' => $validated['last_error'] ?? null,
            'attempts'   => $printJob->attempts + 1,
            'printed_at' => $validated['status'] === 'sent' ? now() : null,
        ]);

        return response()->json(['message' => 'Updated']);
    }
}
