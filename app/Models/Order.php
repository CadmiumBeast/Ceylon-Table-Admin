<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'order_type',
        'order_status',
        'payment_status',
        'order_number',
        'total_price',
        'subtotal',
        'discount',
        'user_id',
        'table_id',
        'delivery_address',
        'rating_score',
        'rating_comment',
        'rated_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function printJobs()
    {
        return $this->hasMany(PrintJob::class);
    }

    public function orderTimes()
    {
        return $this->hasMany(OrderTime::class);
    }

    public function paymentSplits()
    {
        return $this->hasMany(PaymentSplit::class);
    }
}
