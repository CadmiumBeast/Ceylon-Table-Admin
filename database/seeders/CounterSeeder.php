<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CounterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $counters = [
            ['name' => 'Juice Counter'],
            ['name' => 'Food Counter'],
        ];

        foreach ($counters as $counter) {
            \App\Models\Counter::create($counter);
        }
    }
}
