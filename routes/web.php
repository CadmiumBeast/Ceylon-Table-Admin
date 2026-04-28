<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Redirect::route('login');
})->name('home');


Route::middleware(['auth', 'user-access:admin'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

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
