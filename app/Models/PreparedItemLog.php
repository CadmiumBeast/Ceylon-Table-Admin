<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreparedItemLog extends Model
{
    protected $fillable = [
        'item_id',
        'action',
        'quantity',
        'source_order_id',
        'target_order_id',
    ];
}
