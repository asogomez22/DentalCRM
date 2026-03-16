<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('source', 60)->nullable()->after('phone');
            $table->boolean('marketing_opt_in')->default(true)->after('notes');
            $table->timestamp('last_seen_at')->nullable()->after('marketing_opt_in');
            $table->integer('portal_points')->default(0)->after('last_seen_at');
        });

        Schema::create('communication_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('channel', 40);
            $table->string('category', 60);
            $table->string('subject', 180)->nullable();
            $table->text('body');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['clinic_id', 'channel']);
            $table->index(['clinic_id', 'category']);
        });

        Schema::create('communication_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('channel', 40);
            $table->string('segment', 80);
            $table->string('status', 40)->default('draft');
            $table->string('subject', 180)->nullable();
            $table->text('body');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->json('metrics_json')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'status']);
            $table->index(['clinic_id', 'segment']);
        });

        Schema::create('communication_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('communication_campaigns')->nullOnDelete();
            $table->string('channel', 40);
            $table->string('direction', 20)->default('outbound');
            $table->string('status', 40)->default('draft');
            $table->string('subject', 180)->nullable();
            $table->text('body');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'channel', 'status']);
            $table->index(['clinic_id', 'patient_id']);
        });

        Schema::create('patient_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->string('status', 40)->default('published');
            $table->timestamps();

            $table->index(['clinic_id', 'rating']);
            $table->index(['clinic_id', 'status']);
        });

        Schema::create('patient_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('referrer_patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('referral_code', 40);
            $table->string('referred_name', 120);
            $table->string('referred_email')->nullable();
            $table->string('referred_phone', 30)->nullable();
            $table->string('status', 40)->default('invited');
            $table->integer('reward_points')->default(0);
            $table->timestamps();

            $table->unique(['clinic_id', 'referral_code']);
            $table->index(['clinic_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_referrals');
        Schema::dropIfExists('patient_reviews');
        Schema::dropIfExists('communication_logs');
        Schema::dropIfExists('communication_campaigns');
        Schema::dropIfExists('communication_templates');

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['source', 'marketing_opt_in', 'last_seen_at', 'portal_points']);
        });
    }
};
