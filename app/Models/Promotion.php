<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'name',
        'image',
        'start_date',
        'end_date',
        'is_active',
    ];
}
