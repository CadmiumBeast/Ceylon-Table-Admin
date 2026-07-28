<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = [
        'opened_by', 'closed_by', 'opening_cash', 'closing_cash',
        'status', 'opened_at', 'closed_at', 'notes',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function openedBy()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public static function current(): ?self
    {
        return static::where('status', 'open')->latest('opened_at')->first();
    }
}
