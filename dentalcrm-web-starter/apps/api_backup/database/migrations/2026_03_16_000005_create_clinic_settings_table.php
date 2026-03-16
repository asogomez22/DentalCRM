<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('clinic_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('brand_name');
            $table->string('primary_color', 20)->default('#0f766e');
            $table->string('secondary_color', 20)->default('#0f172a');
            $table->text('logo_url')->nullable();
            $table->string('public_phone', 30)->nullable();
            $table->string('public_email', 180)->nullable();
            $table->boolean('booking_enabled')->default(true);
            $table->json('settings_json')->nullable();
            $table->timestamps();

            $table->unique('clinic_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinic_settings');
    }
};
