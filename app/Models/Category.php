<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'name',
        'description',
        'is_active',
        'image',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'image_url',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function counters(): BelongsToMany
    {
        return $this->belongsToMany(Counter::class)->withTimestamps();
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            if (! $this->image) {
                return null;
            }

            if (str_starts_with($this->image, 'http://') || str_starts_with($this->image, 'https://')) {
                return $this->image;
            }

            $path = str_contains($this->image, '/') ? $this->image : 'items/' . $this->image;
            $baseUrl = config('filesystems.disks.s3.url');

            if ($baseUrl) {
                return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
            }

            $bucket = config('filesystems.disks.s3.bucket');
            $region = config('filesystems.disks.s3.region');

            if (! $bucket || ! $region) {
                return null;
            }

            return 'https://' . $bucket . '.s3.' . $region . '.amazonaws.com/' . ltrim($path, '/');
        });
    }

}
