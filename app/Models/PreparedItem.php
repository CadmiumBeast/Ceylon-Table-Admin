<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreparedItem extends Model
{
    protected $fillable = [
        'item_id',
        'item_name',
        'price',
        'quantity',
        'oldest_prepared_at',
    ];

    protected $casts = [
        'oldest_prepared_at' => 'datetime',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
