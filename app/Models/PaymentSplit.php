<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSplit extends Model
{
    protected $fillable = [
        'order_id',
        'amount',
        'amount_tendered',
        'balance_returned',
        'payment_method',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }


}
