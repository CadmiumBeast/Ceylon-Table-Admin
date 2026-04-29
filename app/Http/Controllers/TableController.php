<?php

namespace App\Http\Controllers;

use App\Models\Table;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index()
    {
        $tables = Table::query()->latest()->get();
        return inertia('tables/index', ['tables' => $tables]);
    }

    public function create()
    {
        $previoustable = Table::query()->latest()->first();
        $nextNumber = $previoustable ? (int) substr($previoustable->name, 6) + 1 : 1;
        $nextName = 'Table ' . $nextNumber;

        Table::create([
            'name' => $nextName,
            'is_available' => true,
            'is_active' => true,
        ]);

        return redirect()->route('table.index');
    }

    public function disable($id)
    {
        $table = Table::findOrFail($id);
        $table->is_active = false;
        $table->save();

        return redirect()->route('table.index');
    }

    public function enable($id)
    {
        $table = Table::findOrFail($id);
        $table->is_active = true;
        $table->save();

        return redirect()->route('table.index');
    }
}
