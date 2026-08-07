<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ItemController extends Controller
{
    public function index()
    {
        $categories = Category::with(['items' => function ($q) {
            $q->orderBy('name');
        }])->orderBy('sort_order')->orderBy('id')->get();

        return Inertia::render('items/index', [
            'categories' => $categories,
        ]);
    }

    public function create()
    {
        $categories = Category::orderBy('sort_order')->orderBy('id')->get();
        return Inertia::render('items/create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric',
            'takeaway_price' => 'nullable|numeric|min:0',
            'category_id' => 'required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $data = [
            'name' => $request->get('name'),
            'description' => $request->get('description'),
            'price' => $request->get('price'),
            'takeaway_price' => $request->get('takeaway_price'),
            'category_id' => $request->get('category_id'),
            'is_active' => true,
            'quantity' => $request->get('quantity', 0),
        ];

        if ($request->hasFile('image')) {
            $imageUrl = $this->uploadImageToS3($request->file('image'));
            $data['image_url'] = $imageUrl;
        }

        Item::create($data);

        return redirect()->route('items.index')->with('success', 'Item created successfully.');
    }

    public function edit(Item $item)
    {
        $categories = Category::orderBy('sort_order')->orderBy('id')->get();
        return Inertia::render('items/edit', [
            'item' => $item,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Item $item)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric',
            'takeaway_price' => 'nullable|numeric|min:0',
            'category_id' => 'required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $data = [
            'name' => $request->get('name'),
            'description' => $request->get('description'),
            'price' => $request->get('price'),
            'takeaway_price' => $request->get('takeaway_price'),
            'category_id' => $request->get('category_id'),
            'quantity' => $request->get('quantity', $item->quantity),
        ];

        if ($request->hasFile('image')) {
            $imageUrl = $this->uploadImageToS3($request->file('image'));
            $data['image_url'] = $imageUrl;
        }

        $item->update($data);
        return redirect()->route('items.index')->with('success', 'Item updated successfully.');
    }

    public function unavailable(Item $item)
    {
        $item->update(['is_active' => false]);
        return redirect()->route('items.index')->with('success', 'Item marked as unavailable.');
    }

    public function available(Item $item)
    {
        $item->update(['is_active' => true]);
        return redirect()->route('items.index')->with('success', 'Item marked as available.');
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
}
