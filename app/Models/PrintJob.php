<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrintJob extends Model
{
    protected $fillable = [
        'order_id',
        'counter_id',
        'printer_ip',
        'printer_port',
        'payload',
        'status',
        'attempts',
        'last_error',
        'printed_at',
        'interface_type',
        'printer_name',
    ];

    protected $casts = [
        'payload' => 'array',
        'printed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function counter()
    {
        return $this->belongsTo(Counter::class);
    }
}
