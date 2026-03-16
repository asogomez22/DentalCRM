<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration {
    public function up(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'clinica-demo')->value('id');

        if (!$clinicId) {
            $clinicId = DB::table('clinics')->insertGetId([
                'name' => 'Clinica Demo',
                'slug' => 'clinica-demo',
                'domain' => 'clinica-demo.local',
                'plan' => 'starter',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('clinic_settings')->updateOrInsert(
            ['clinic_id' => $clinicId],
            [
                'brand_name' => 'Clinica Demo',
                'primary_color' => '#0f766e',
                'secondary_color' => '#0f172a',
                'public_phone' => '+34 000 000 000',
                'public_email' => 'info@clinica-demo.local',
                'booking_enabled' => true,
                'settings_json' => json_encode([]),
                'logo_url' => null,
                'updated_at' => Carbon::now(),
                'created_at' => Carbon::now(),
            ],
        );

        DB::table('users')->updateOrInsert(
            ['clinic_id' => $clinicId, 'email' => 'admin@clinica.com'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('secret'),
                'role' => 'admin',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('users')->updateOrInsert(
            ['clinic_id' => $clinicId, 'email' => 'dentista@clinica.com'],
            [
                'name' => 'Dentista Demo',
                'password' => Hash::make('secret'),
                'role' => 'dentist',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        foreach ([
            ['Consulta', 30, 3000, true],
            ['Limpieza', 45, 4500, true],
            ['Ortodoncia', 60, 7500, true],
        ] as [$name, $duration, $price, $isActive]) {
            DB::table('treatments')->updateOrInsert(
                ['clinic_id' => $clinicId, 'name' => $name],
                [
                    'duration_minutes' => $duration,
                    'price_cents' => $price,
                    'is_active' => $isActive,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );
        }
    }

    public function down(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'clinica-demo')->value('id');
        if (!$clinicId) {
            return;
        }

        DB::table('treatments')->where('clinic_id', $clinicId)->delete();
        DB::table('users')->where('clinic_id', $clinicId)->delete();
        DB::table('clinic_settings')->where('clinic_id', $clinicId)->delete();
        DB::table('patients')->where('clinic_id', $clinicId)->delete();
        DB::table('appointments')->where('clinic_id', $clinicId)->delete();
        DB::table('clinics')->where('id', $clinicId)->delete();
    }
};
