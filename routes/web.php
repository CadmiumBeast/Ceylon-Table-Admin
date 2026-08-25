<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\SalesReportController;


Route::get('/', function () {
    return Redirect::route('login');
})->name('home');

Route::get('/privacy-policy', function () {
    return Inertia::render('PrivacyPolicy');
})->name('privacy-policy');

Route::get('/display', function () {
    return Inertia::render('Display');
})->name('display');

Route::middleware(['auth', 'user-access:admin'])->group(function () {
    Route::resource('users', UserController::class)->except(['show']);


    // Category routes
    Route::resource('categories', \App\Http\Controllers\CategoryController::class)->except(['show']);
    Route::post('categories/{id}/disable', [\App\Http\Controllers\CategoryController::class, 'disable'])->name('categories.disable');
    Route::post('categories/{id}/enable', [\App\Http\Controllers\CategoryController::class, 'enable'])->name('categories.enable');

    Route::get('/orders/{order}/adminedit', [\App\Http\Controllers\OrderController::class, 'Orderedit'])->name('orders.adminedit');

});

Route::middleware(['auth', 'user-access:customer'])->group(function () {

});

Route::middleware(['auth', 'user-access:chef'])->group(function () {

});

Route::middleware(['auth', 'user-access:admin,manager'])->group(function () {
    //Table routes
    Route::get('/tables', [\App\Http\Controllers\TableController::class, 'index'])->name('table.index');
    Route::get('/tables/create', [\App\Http\Controllers\TableController::class, 'create'])->name('table.create');
    Route::post('tables/{id}/disable', [\App\Http\Controllers\TableController::class, 'disable'])->name('table.disable');
    Route::post('tables/{id}/enable', [\App\Http\Controllers\TableController::class, 'enable'])->name('table.enable');

    Route::post('items/{item}/unavailable', [\App\Http\Controllers\ItemController::class, 'unavailable'])->name('items.unavailable');
    Route::post('items/{item}/available', [\App\Http\Controllers\ItemController::class, 'available'])->name('items.available');

    // Item routes
    Route::resource('items', \App\Http\Controllers\ItemController::class)->except(['show']);

    // Cart routes
    Route::get('/carts', [\App\Http\Controllers\CartController::class, 'index'])->name('carts.index');

    Route::get('/reports/sales', [SalesReportController::class, 'index'])->name('reports.sales');
    Route::get('/reports/sales/data', [SalesReportController::class, 'data'])->name('reports.sales.data');
    Route::post('/reports/sales/print', [SalesReportController::class, 'print'])->name('reports.sales.print');

    // Promotion routes
    Route::resource('promotions', \App\Http\Controllers\PromotionController::class)->except(['show']);

});
Route::middleware(['auth', 'user-access:admin,manager,staff'])->group(function () {
    Route::resource('customers', \App\Http\Controllers\CustomerController::class)->except(['show']);
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');




});
Route::middleware(['auth', 'user-access:admin,staff'])->group(function () {
    Route::get('/juice-bar', [\App\Http\Controllers\OrderController::class, 'juiceBar'])->name('juice-bar.index');
    // Order routes
    Route::get('/orders', [\App\Http\Controllers\OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/completed', [\App\Http\Controllers\OrderController::class, 'indexCompleted'])->name('orders.completed');
    Route::get('/orders/create', [\App\Http\Controllers\OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders', [\App\Http\Controllers\OrderController::class, 'store'])->name('orders.store');
    Route::get('/orders/{order}', [\App\Http\Controllers\OrderController::class, 'show'])->name('orders.show');
    Route::patch('/orders/{order}/status', [\App\Http\Controllers\OrderController::class, 'updateStatus'])->name('orders.update-status');
    Route::patch('/orders/{order}/payment-status', [\App\Http\Controllers\OrderController::class, 'updatePaymentStatus'])->name('orders.update-payment-status');
    Route::patch('/orders/{order}/items/{orderItem}/status', [\App\Http\Controllers\OrderController::class, 'updateItemStatus'])->name('orders.update-item-status');
    Route::get('/orders/{order}/receipt', [\App\Http\Controllers\OrderController::class, 'receipt'])->name('orders.receipt');
    Route::post('/orders/{order}/silent-print', [\App\Http\Controllers\OrderController::class, 'silentPrint'])->name('orders.silent-print');
    Route::get('orders/{order}/edit', [\App\Http\Controllers\OrderController::class, 'edit'])->name('orders.edit');
    Route::post('orders/{order}/add-items', [\App\Http\Controllers\OrderController::class, 'addItems'])->name('orders.add-items');
    Route::delete('orders/{order}/items/{orderItem}', [\App\Http\Controllers\OrderController::class, 'removeItem'])->name('orders.remove-item');
    Route::patch('orders/{order}/payment', [\App\Http\Controllers\OrderController::class, 'processPayment'])->name('orders.process-payment');
    Route::put('/orders/{order}', [\App\Http\Controllers\OrderController::class, 'update'])->name('orders.update');

});

Route::middleware(['auth', 'user-access:admin'])->group(function () {
    Route::patch('/orders/{order}/cancel', [\App\Http\Controllers\OrderController::class, 'cancel'])->name('orders.cancel');
});

Route::middleware(['auth', 'user-access:delivery'])->group(function () {

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
