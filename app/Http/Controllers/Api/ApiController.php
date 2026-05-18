<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    //Table
    public function getNotAvailableTables()
    {
        $tables = \App\Models\Table::where('is_available', false)->where('is_active', true)->get();
        return response()->json($tables);
    }
    public function getAvailableTables()
    {
        $tables = \App\Models\Table::where('is_available', true)->where('is_active', true)->get();
        return response()->json($tables);
    }

    //Category
    public function getCategories()
    {
        $categories = \App\Models\Category::where('is_active', true)->get();
        return response()->json($categories);
    }


    //Item
    public function getItemsByCategory($categoryId)
    {
        $items = \App\Models\Item::where('category_id', $categoryId)->where('is_active', true)->get();
        return response()->json($items);
    }
}
