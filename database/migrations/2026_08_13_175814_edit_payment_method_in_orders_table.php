<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {

        DB::table('orders')
                ->whereNotNull('payment_method')
                ->where('payment_status', 'paid')
                ->whereNotIn('id', function ($query) {
                    $query->select('order_id')->from('payment_splits');
                })
                ->orderBy('id')
                ->chunkById(200, function ($orders) {
                    foreach ($orders as $order) {
                        DB::table('payment_splits')->insert([
                            'order_id'         => $order->id,
                            'payment_method'   => $order->payment_method,
                            'amount'           => $order->total_price,
                            'amount_tendered'  => $order->payment_method === 'Cash' ? $order->total_price : null,
                            'balance_returned' => $order->payment_method === 'Cash' ? 0 : null,
                            'created_at'       => $order->created_at,
                            'updated_at'       => $order->updated_at,
                        ]);
                    }
                });
        Schema::table('orders', function (Blueprint $table) {
                        $table->dropColumn('payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method')->nullable();
        });
    }
};
