<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Counter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::query()->latest()->get();
        return inertia('categories/index', ['categories' => $categories]);
    }

    public function create()
    {
        return inertia('categories/create', [
            'counters' => Counter::query()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
            'counter_ids' => ['nullable', 'array'],
            'counter_ids.*' => ['integer', 'exists:counters,id'],
        ]);

        $counterIds = $validated['counter_ids'] ?? [];
        unset($validated['counter_ids']);

        if ($request->hasFile('image')) {
            $imageUrl = $this->uploadImageToS3($request->file('image'));
            $validated['image'] = $imageUrl;
        }

        $category = Category::create(array_merge($validated, ['is_active' => true]));
        $category->counters()->sync($counterIds);

        return redirect()->route('categories.index');
    }

    public function edit($id)
    {
        $category = Category::with('counters')->findOrFail($id);

        return inertia('categories/edit', [
            'category' => $category,
            'counters' => Counter::query()->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name,' . $category->id],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
            'counter_ids' => ['nullable', 'array'],
            'counter_ids.*' => ['integer', 'exists:counters,id'],
        ]);

        $counterIds = $validated['counter_ids'] ?? [];
        unset($validated['counter_ids']);

        if ($request->hasFile('image')) {
            $validated['image'] = $this->uploadImageToS3($request->file('image'));
        }

        $category->update($validated);
        $category->counters()->sync($counterIds);

        return redirect()->route('categories.index');
    }

    public function disable($id)
    {
        $category = Category::findOrFail($id);
        $category->is_active = false;
        $category->save();

        return redirect()->route('categories.index');
    }

    public function enable($id)
    {
        $category = Category::findOrFail($id);
        $category->is_active = true;
        $category->save();

        return redirect()->route('categories.index');
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        $category->counters()->detach();
        $category->delete();

        return redirect()->route('categories.index');
    }

    private function uploadImageToS3($file)
    {
        try {
            $key = 'categories/' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $uploaded = Storage::disk('s3')->putFileAs('categories', $file, basename($key));

            if (! $uploaded) {
                throw new \RuntimeException('S3 upload failed for ' . $key);
            }

            return $uploaded;
        } catch (\Throwable $e) {
            \Log::error('Image upload to S3 failed: ' . $e->getMessage());
            throw $e;
        }
    }
}


