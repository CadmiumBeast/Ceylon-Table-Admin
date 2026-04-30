<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Redirect::route('login');
})->name('home');


Route::middleware(['auth', 'user-access:admin'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::resource('users', UserController::class)->except(['show' ]);

    //Table routes
    Route::get('/tables', [\App\Http\Controllers\TableController::class, 'index'])->name('table.index');
    Route::get('/tables/create', [\App\Http\Controllers\TableController::class, 'create'])->name('table.create');
    Route::post('tables/{id}/disable', [\App\Http\Controllers\TableController::class, 'disable'])->name('table.disable');
    Route::post('tables/{id}/enable', [\App\Http\Controllers\TableController::class, 'enable'])->name('table.enable');

    // Category routes
    Route::resource('categories', \App\Http\Controllers\CategoryController::class)->except(['show']);
    Route::post('categories/{id}/disable', [\App\Http\Controllers\CategoryController::class, 'disable'])->name('categories.disable');
    Route::post('categories/{id}/enable', [\App\Http\Controllers\CategoryController::class, 'enable'])->name('categories.enable');

    // Item routes
    Route::resource('items', \App\Http\Controllers\ItemController::class)->except(['show']);
    Route::post('items/{item}/unavailable', [\App\Http\Controllers\ItemController::class, 'unavailable'])->name('items.unavailable');
    Route::post('items/{item}/available', [\App\Http\Controllers\ItemController::class, 'available'])->name('items.available');
});

Route::middleware(['auth', 'user-access:customer'])->group(function () {

});

Route::middleware(['auth', 'user-access:chef'])->group(function () {

});

Route::middleware(['auth', 'user-access:staff'])->group(function () {

});

Route::middleware(['auth', 'user-access:delivery'])->group(function () {

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
