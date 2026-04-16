<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'maxilart')->value('id');

        if (!$clinicId) {
            $clinicId = DB::table('clinics')->insertGetId([
                'name' => 'MaxilArt',
                'slug' => 'maxilart',
                'domain' => 'maxilart.local',
                'plan' => 'starter',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('users')->updateOrInsert(
            ['clinic_id' => $clinicId, 'email' => 'coordinacion@maxilart.example'],
            [
                'name' => 'Equipo MaxilArt',
                'password' => Hash::make('password'),
                'role' => 'dentist',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
