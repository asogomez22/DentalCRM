<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration {
    public function up(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'maxilart')->value('id');

        if (!$clinicId) {
            $clinicId = DB::table('clinics')->insertGetId([
                'name' => 'MaxilArt',
                'slug' => 'maxilart',
                'domain' => 'maxilart.local',
                'plan' => 'starter',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('clinic_settings')->updateOrInsert(
            ['clinic_id' => $clinicId],
            [
                'brand_name' => 'MaxilArt',
                'primary_color' => '#0f766e',
                'secondary_color' => '#0f172a',
                'public_phone' => '+34 910 820 430',
                'public_email' => 'hola@maxilart.example',
                'booking_enabled' => true,
                'settings_json' => json_encode([
                    'website' => [
                        'hero_title' => 'MaxilArt',
                        'hero_copy' => 'Cirugia oral, implantologia y estetica dental con seguimiento digital, reserva online y area privada para pacientes.',
                    ],
                ]),
                'logo_url' => null,
                'updated_at' => Carbon::now(),
                'created_at' => Carbon::now(),
            ],
        );

        DB::table('users')->updateOrInsert(
            ['clinic_id' => $clinicId, 'email' => 'direccion@maxilart.example'],
            [
                'name' => 'Dra. Clara Vega',
                'password' => Hash::make('secret'),
                'role' => 'admin',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('users')->updateOrInsert(
            ['clinic_id' => $clinicId, 'email' => 'dr.hugo.ortega@maxilart.example'],
            [
                'name' => 'Dr. Hugo Ortega',
                'password' => Hash::make('secret'),
                'role' => 'dentist',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        foreach ([
            ['Primera valoracion', 45, 6500, true],
            ['Higiene avanzada', 60, 8900, true],
            ['Diseno de sonrisa', 90, 15000, true],
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
        $clinicId = DB::table('clinics')->where('slug', 'maxilart')->value('id');
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
