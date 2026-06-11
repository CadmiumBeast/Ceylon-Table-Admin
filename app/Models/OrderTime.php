<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderTime extends Model
{
    protected $fillable = [
        'order_id',
        'item_id',
        'ordered_time',
        'cooking_time',
        'ready_time',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
