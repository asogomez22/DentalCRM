<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicSetting;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppointmentValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_booking_endpoints_are_blocked_when_booking_is_disabled(): void
    {
        $clinic = Clinic::create([
            'name' => 'Clinica Sin Reservas',
            'slug' => 'clinica-sin-reservas',
            'domain' => 'clinica-sin-reservas.local',
            'plan' => 'starter',
            'is_active' => true,
        ]);

        ClinicSetting::create([
            'clinic_id' => $clinic->id,
            'brand_name' => 'Clinica Sin Reservas',
            'primary_color' => '#0f766e',
            'secondary_color' => '#0f172a',
            'booking_enabled' => false,
        ]);

        $dentist = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Dentista Demo',
            'email' => 'dentista@clinica-sin-reservas.local',
            'password' => Hash::make('secret'),
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $this->getJson(
            '/api/v1/appointments/availability?date=2026-03-20&dentist_id='.$dentist->id,
            $headers,
        )->assertForbidden();

        $this->postJson('/api/v1/appointments/book', [
            'patient' => [
                'first_name' => 'Laura',
                'last_name' => 'Gomez',
                'email' => 'laura@example.com',
                'phone' => '+34600111222',
            ],
            'dentist_id' => $dentist->id,
            'slot' => '2026-03-20T11:00:00+01:00',
        ], $headers)->assertForbidden();
    }

    public function test_authenticated_appointment_creation_rejects_foreign_patient_and_dentist_ids(): void
    {
        $clinicA = Clinic::create([
            'name' => 'Clinica A',
            'slug' => 'clinica-a',
            'domain' => 'clinica-a.local',
            'plan' => 'starter',
            'is_active' => true,
        ]);

        $clinicB = Clinic::create([
            'name' => 'Clinica B',
            'slug' => 'clinica-b',
            'domain' => 'clinica-b.local',
            'plan' => 'starter',
            'is_active' => true,
        ]);

        $adminA = User::create([
            'clinic_id' => $clinicA->id,
            'name' => 'Admin A',
            'email' => 'admin@clinica-a.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $foreignDentist = User::create([
            'clinic_id' => $clinicB->id,
            'name' => 'Dentista B',
            'email' => 'dentista@clinica-b.local',
            'password' => Hash::make('secret'),
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $foreignPatient = Patient::create([
            'clinic_id' => $clinicB->id,
            'first_name' => 'Paciente',
            'last_name' => 'Externo',
            'email' => 'paciente@clinica-b.local',
            'phone' => '+34600111333',
        ]);

        Sanctum::actingAs($adminA);

        $startsAt = Carbon::parse('2026-03-20 10:00:00');
        $endsAt = $startsAt->copy()->addMinutes(30);

        $this->postJson('/api/v1/appointments', [
            'patient_id' => $foreignPatient->id,
            'dentist_id' => $foreignDentist->id,
            'status' => 'confirmed',
            'starts_at' => $startsAt->toIso8601String(),
            'ends_at' => $endsAt->toIso8601String(),
        ], [
            'X-Clinic-Slug' => $clinicA->slug,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['patient_id', 'dentist_id']);
    }
}
