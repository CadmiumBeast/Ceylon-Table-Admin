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
            [
                'name' => 'Juice Counter',
                'printer_ip' => '192.168.1.211'
            ],
            [
                'name' => 'Kitchen',
                'printer_ip' => '192.168.1.210'
            ],
        ];

        foreach ($counters as $counter) {
            \App\Models\Counter::create($counter);
        }
    }
}
