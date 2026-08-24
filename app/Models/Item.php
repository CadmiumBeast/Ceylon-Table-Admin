<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $fillable = [
        'name',
        'description',
        'price',
        'takeaway_price',
        'category_id',
        'is_active',
        'image_url',
        'quantity',

    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function priceForOrderType(string $orderType): float
    {
        $usesTakeawayBase = in_array($orderType, ['takeaway', 'uber', 'pickme'], true)
            && $this->takeaway_price !== null;

        $price = $usesTakeawayBase ? (float) $this->takeaway_price : (float) $this->price;

        if (in_array($orderType, ['uber', 'pickme'], true)) {
            $price *= 0.7; // 30% off for delivery-aggregator orders (commission offset)
        }

        return round($price, 2);
    }



    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function (?string $value) {
                if (! $value || str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
                    return $value;
                }

                if (str_starts_with($value, 's3://')) {
                    $path = ltrim(substr($value, 5), '/');
                    $baseUrl = config('filesystems.disks.s3.url');

                    if ($baseUrl) {
                        return rtrim($baseUrl, '/') . '/' . $path;
                    }

                    $bucket = config('filesystems.disks.s3.bucket');
                    $region = config('filesystems.disks.s3.region');

                    return 'https://' . $bucket . '.s3.' . $region . '.amazonaws.com/' . $path;
                }

                $path = str_starts_with($value, 'items/') ? $value : 'items/' . ltrim($value, '/');
                $baseUrl = config('filesystems.disks.s3.url');

                if ($baseUrl) {
                    return rtrim($baseUrl, '/') . '/' . $path;
                }

                $bucket = config('filesystems.disks.s3.bucket');
                $region = config('filesystems.disks.s3.region');

                return 'https://' . $bucket . '.s3.' . $region . '.amazonaws.com/' . $path;
            },
        );
    }
}
