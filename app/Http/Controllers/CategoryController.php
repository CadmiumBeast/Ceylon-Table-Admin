<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::query()->latest()->get();
        return inertia('categories/index', ['categories' => $categories]);
    }

    public function create()
    {
        return inertia('categories/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
            'description' => ['nullable', 'string'],
        ]);

        Category::create(array_merge($validated, ['is_active' => true]));

        return redirect()->route('categories.index');
    }

    public function edit($id)
    {
        $category = Category::findOrFail($id);
        return inertia('categories/edit', ['category' => $category]);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name,' . $category->id],
            'description' => ['nullable', 'string'],
        ]);

        $category->update($validated);

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
}


