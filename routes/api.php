<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/signup', [AuthController::class, 'signup']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/not-available-tables', [\App\Http\Controllers\Api\ApiController::class, 'getNotAvailableTables']);
    Route::get('/available-tables', [\App\Http\Controllers\Api\ApiController::class, 'getAvailableTables']);

    Route::get('/categories', [\App\Http\Controllers\Api\ApiController::class, 'getCategories']);

    Route::get('/categories/{categoryId}/items', [\App\Http\Controllers\Api\ApiController::class, 'getItemsByCategory']);

    Route::post('/cart/items', [\App\Http\Controllers\Api\ApiController::class, 'addCartItem']);
    Route::delete('/cart/items/{cartItemId}', [\App\Http\Controllers\Api\ApiController::class, 'removeCartItem']);
    Route::get('/cart/{cartId}/items', [\App\Http\Controllers\Api\ApiController::class, 'getCartItems']);

    Route::post('/place-order', [\App\Http\Controllers\Api\ApiController::class, 'placeOrder']);
});
