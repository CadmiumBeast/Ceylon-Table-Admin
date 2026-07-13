<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->string('printer_ip')->nullable()->after('name');
            $table->unsignedInteger('printer_port')->default(9100)->after('printer_ip');
        });
    }

    public function down(): void
    {
        Schema::table('counters', function (Blueprint $table) {
            $table->dropColumn(['printer_ip', 'printer_port']);
        });
    }
};
