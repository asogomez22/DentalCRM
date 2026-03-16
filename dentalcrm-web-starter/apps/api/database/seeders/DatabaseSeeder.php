<?php

namespace Database\Seeders;

use App\Models\User;
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
        $clinicId = DB::table('clinics')->where('slug', 'clinica-demo')->value('id');

        if (!$clinicId) {
            $clinicId = DB::table('clinics')->insertGetId([
                'name' => 'Clinica Demo',
                'slug' => 'clinica-demo',
                'domain' => 'clinica-demo.local',
                'plan' => 'starter',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('users')->updateOrInsert(
            ['clinic_id' => $clinicId, 'email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role' => 'dentist',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
