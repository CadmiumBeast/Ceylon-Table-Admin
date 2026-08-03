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
        Schema::table('counters', function (Blueprint $table) {
            if (!Schema::hasColumn('counters', 'interface_type')) {
                $table->string('interface_type')->default('network')->after('name');
            }
            if (!Schema::hasColumn('counters', 'printer_name')) {
                $table->string('printer_name')->nullable()->after('interface_type');
            }
            if (!Schema::hasColumn('counters', 'printer_ip')) {
                $table->string('printer_ip')->nullable();
            }
            if (!Schema::hasColumn('counters', 'printer_port')) {
                $table->unsignedInteger('printer_port')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->dropColumn(['interface_type', 'printer_name', 'printer_ip', 'printer_port']);
        });
    }
};
