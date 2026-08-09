<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('prepared_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->string('item_name'); // snapshot, survives item rename/delete
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('quantity')->default(0);
            $table->timestamp('oldest_prepared_at')->nullable();
            $table->timestamps();

            $table->unique('item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prepared_items');
    }
};
