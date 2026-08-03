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
        Schema::table('print_jobs', function (Blueprint $table) {
            $table->string('interface_type')->default('network')->after('counter_id'); // network | usb
            $table->string('printer_name')->nullable()->after('printer_port');
        });

        // existing rows are all network-based IP printers
        DB::table('print_jobs')->update(['interface_type' => 'network']);

        Schema::table('print_jobs', function (Blueprint $table) {
            $table->string('printer_ip')->nullable()->change();
            $table->unsignedInteger('printer_port')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('print_jobs', function (Blueprint $table) {
            $table->dropColumn('interface_type');
            $table->dropColumn('printer_name');
            $table->string('printer_ip')->nullable(false)->change();
            $table->unsignedInteger('printer_port')->nullable(false)->change();
        });
    }
};
