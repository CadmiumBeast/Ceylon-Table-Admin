<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use Inertia\Inertia;

class CartController extends Controller
{
    public function index()
    {
        $carts = Cart::with(['user', 'table', 'items.item'])
            ->whereHas('items')
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('carts/index', [
            'carts' => $carts,
        ]);
    }
}
