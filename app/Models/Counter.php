<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Counter extends Model
{
    protected $fillable = [
        'name',
        'printer_ip',
        'printer_port',
    ];


    public function categories()
    {
        return $this->belongsToMany(Category::class)->withTimestamps();
    }

    public function printJobs()
    {
        return $this->hasMany(PrintJob::class);
    }

}
