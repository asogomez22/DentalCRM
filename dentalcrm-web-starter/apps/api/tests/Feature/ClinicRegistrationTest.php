<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicSetting;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_clinic_registration_creates_clinic_owner_and_default_catalog(): void
    {
        $response = $this->postJson('/api/v1/public/clinics/register', [
            'clinic_name' => 'Clinica Horizonte',
            'slug' => 'clinica-horizonte',
            'owner_name' => 'Laura Soto',
            'owner_email' => 'laura@horizonte.local',
            'password' => 'secret123',
            'public_phone' => '+34910000000',
            'public_email' => 'hola@horizonte.local',
            'plan' => 'growth',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('clinic.slug', 'clinica-horizonte')
            ->assertJsonPath('user.email', 'laura@horizonte.local')
            ->assertJsonStructure([
                'token',
                'token_type',
                'user',
                'clinic',
                'settings',
            ]);

        $clinic = Clinic::where('slug', 'clinica-horizonte')->firstOrFail();

        $this->assertDatabaseHas('users', [
            'clinic_id' => $clinic->id,
            'email' => 'laura@horizonte.local',
            'role' => 'admin',
        ]);

        $this->assertInstanceOf(ClinicSetting::class, $clinic->settings()->first());
        $this->assertSame(3, Treatment::where('clinic_id', $clinic->id)->count());
        $this->assertTrue(User::where('clinic_id', $clinic->id)->firstOrFail()->is_active);
    }
}
