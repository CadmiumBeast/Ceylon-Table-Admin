<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApiController;


Route::post('/signup', [AuthController::class, 'signup']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/staff/{userId}/daily-stats', [ApiController::class, 'getDailyStats']);

    Route::get('/not-available-tables', [ApiController::class, 'getNotAvailableTables']);
    Route::get('/available-tables', [ApiController::class, 'getAvailableTables']);
    Route::get('/tables/{tableId}', [ApiController::class, 'getTableDetails']);

    Route::get('/categories', [ApiController::class, 'getCategories']);

    Route::get('/categories/{categoryId}/items', [ApiController::class, 'getItemsByCategory']);
    Route::get('/items', [ApiController::class, 'getAllItems']);

    Route::post('/cart/items', [ApiController::class, 'addCartItem']);
    Route::delete('/cart/items/{cartItemId}', [ApiController::class, 'removeCartItem']);
    Route::get('/cart/{cartId}/items', [ApiController::class, 'getCartItems']);

    Route::post('/place-order', [ApiController::class, 'placeOrder']);
    Route::post('/orders/{orderId}/update-items', [ApiController::class, 'updateOrderItems']);
    Route::post('/orders/{orderId}/close-order', [ApiController::class, 'closeOrder']);

    // Chef
    Route::get('/chef/dashboard', [ApiController::class, 'getDashboardData']);
    Route::post('/orders/{orderId}/kitchen-status', [ApiController::class, 'updateKitchenStatus']);
    Route::get('/chef/weekly-stats', [ApiController::class, 'getWeeklyStats']);
});
