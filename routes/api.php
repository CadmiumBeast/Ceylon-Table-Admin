<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\PrintJobController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApiController;


Route::post('/signup', [AuthController::class, 'signup']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/staff/{userId}/daily-stats', [ApiController::class, 'getDailyStats']);
    //Delete user account
    Route::delete('/user', [AuthController::class, 'deleteAccount']);

    Route::get('/not-available-tables', [ApiController::class, 'getNotAvailableTables']);
    Route::get('/available-tables', [ApiController::class, 'getAvailableTables']);
    Route::get('/tables/{tableId}', [ApiController::class, 'getTableDetails']);

    Route::get('/categories', [ApiController::class, 'getCategories']);

    Route::get('/categories/{categoryId}/items', [ApiController::class, 'getItemsByCategory']);
    Route::get('/items', [ApiController::class, 'getAllItems']);

    Route::post('/cart/items', [ApiController::class, 'addCartItem']);
    Route::delete('/cart/items/{cartItemId}', [ApiController::class, 'removeCartItem']);
    Route::get('/cart/{cartId}/items', [ApiController::class, 'getCartItems']);
    Route::patch('/cart/items/{cartItemId}', [ApiController::class, 'updateCartItemQuantity']);

    Route::post('/place-order', [ApiController::class, 'placeOrder']);
    Route::post('/orders/{orderId}/update-items', [ApiController::class, 'updateOrderItems']);
    Route::post('/orders/{orderId}/close-order', [ApiController::class, 'closeOrder']);
    Route::post('/customer/checkout', [ApiController::class, 'customerCheckout']);
    Route::get('/customer/orders/history', [ApiController::class, 'getOrderHistory']);
    Route::post('/customer/orders/{orderId}/repeat', [ApiController::class, 'repeatPastOrder']);
    Route::post('/customer/orders/{orderId}/rate', [ApiController::class, 'ratePastOrder']);

    // Chef
    Route::get('/chef/dashboard', [ApiController::class, 'getDashboardData']);
    Route::get('/chef/weekly-stats', [ApiController::class, 'getWeeklyStats']);
    Route::post('/chef/item/{orderitemId}/status', [ApiController::class, 'updateItemStatus']);
    Route::get('/staff/ready-items', [ApiController::class, 'getReadyItems']);
    Route::post('/staff/item/{orderItemId}/serve', [ApiController::class, 'markItemAsServed']);

    Route::get('/print-jobs/pending', [PrintJobController::class, 'pending']);
    Route::patch('/print-jobs/{printJob}', [PrintJobController::class, 'updateStatus']);

    // routes/api.php
    Route::get('/customers/lookup', function (Request $request) {
        $customer = \App\Models\Customer::where('phone_number', $request->phone)->first();
        if (!$customer) {
            return response()->json(['message' => 'Not found'], 404);
        }
        return response()->json([
            'first_name' => $customer->first_name,
            'last_name'  => $customer->last_name,
            'phone'      => $customer->phone_number,
            'dob'        => $customer->date_of_birth,
        ]);
    });
});
