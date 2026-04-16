<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('email')->nullable(false);
                $table->string('password');
                $table->string('role')->default('dentist');
                $table->boolean('is_active')->default(true);
                $table->rememberToken();
                $table->timestamps();

                $table->unique(['clinic_id', 'email']);
            });

            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasIndex('users', 'users_email_unique')) {
                $table->dropUnique('users_email_unique');
            }

            if (!Schema::hasColumn('users', 'clinic_id')) {
                $table->foreignId('clinic_id')->constrained()->cascadeOnDelete();
            }

            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('dentist');
            }

            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });

        if (!Schema::hasIndex('users', 'users_clinic_id_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique(['clinic_id', 'email']);
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        if (Schema::hasIndex('users', 'users_clinic_id_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_clinic_id_email_unique');
            });
        }

        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }

        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }

        if (Schema::hasColumn('users', 'clinic_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropConstrainedForeignId('clinic_id');
            });
        }
    }
};
