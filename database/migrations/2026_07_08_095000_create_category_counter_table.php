<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('category_counter', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('counter_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['category_id', 'counter_id']);
        });

        if (Schema::hasColumn('categories', 'counter_id')) {
            $rows = DB::table('categories')
                ->whereNotNull('counter_id')
                ->select('id', 'counter_id')
                ->get()
                ->map(fn ($row) => [
                    'category_id' => $row->id,
                    'counter_id' => $row->counter_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all();

            if ($rows !== []) {
                DB::table('category_counter')->insert($rows);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('category_counter');
    }
};
