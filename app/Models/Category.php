<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'name',
        'description',
        'is_active',
        'image',
    ];

    public function items()
    {
        return $this->hasMany(Item::class);
    }

    public function counters()
    {
        return $this->belongsToMany(Counter::class)->withTimestamps();
    }

}
