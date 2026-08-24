<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;


class PromotionController extends Controller
{
    public function index()
    {
        $promotions = \App\Models\Promotion::all();
        return inertia('promotions/index', compact('promotions'));
    }

    public function create()
    {
        return inertia('promotions/create');
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_active' => 'required|boolean',
        ]);

        //if image upload fail. send as null. save data to db. user can edit and upload image later.
        if ($request->hasFile('image')) {
            try {
                $imageUrl = $this->uploadImageToS3($request->file('image'));
                $validatedData['image'] = $imageUrl;
            } catch (\Throwable $e) {
                \Log::error('Image upload failed: ' . $e->getMessage());
                $validatedData['image'] = null; // Set image to null if upload fails
            }
        }

        \App\Models\Promotion::create($validatedData);

        return redirect()->route('promotions.index')->with('success', 'Promotion created successfully.');
    }

    private function uploadImageToS3($file)
    {
        try {
            $bucket = config('filesystems.disks.s3.bucket');
            $region = config('filesystems.disks.s3.region');
            $key = 'items/' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();

            $uploaded = \Storage::disk('s3')->putFileAs('items', $file, basename($key));

            if (! $uploaded) {
                throw new \RuntimeException('S3 upload failed for ' . $key);
            }

            return basename($key);
        } catch (\Throwable $e) {
            \Log::error('Image upload to S3 failed: ' . $e->getMessage());
            throw $e;
        }
    }

    public function edit($id)
    {
        $promotion = \App\Models\Promotion::findOrFail($id);
        return inertia('promotions/edit', compact('promotion'));
    }

    public function update(Request $request, $id)
    {
        $promotion = \App\Models\Promotion::findOrFail($id);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_active' => 'required|boolean',
        ]);

        if ($request->hasFile('image')) {
            try {
                $imageUrl = $this->uploadImageToS3($request->file('image'));
                $validatedData['image'] = $imageUrl;
            } catch (\Throwable $e) {
                \Log::error('Image upload failed: ' . $e->getMessage());
                $validatedData['image'] = null; // Set image to null if upload fails
            }
        }

        $promotion->update($validatedData);

        return redirect()->route('promotions.index')->with('success', 'Promotion updated successfully.');
    }

    public function destroy($id)
    {
        $promotion = \App\Models\Promotion::findOrFail($id);
        $promotion->delete();

        return redirect()->route('promotions.index')->with('success', 'Promotion deleted successfully.');
    }

    public function getActivePromotions()
    {
        $activePromotions = \App\Models\Promotion::where('is_active', true)
            ->whereDate('start_date', '<=', now())
            ->whereDate('end_date', '>=', now())
            ->get();

        return response()->json($activePromotions);
    }


}
