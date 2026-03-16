<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CatalogEndpointsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_catalog_endpoints_are_available_while_private_catalog_requires_authentication(): void
    {
        $clinic = Clinic::create([
            'name' => 'Clinica Catalogo',
            'slug' => 'clinica-catalogo',
            'domain' => 'clinica-catalogo.local',
            'plan' => 'starter',
            'is_active' => true,
        ]);

        User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Dentista Demo',
            'email' => 'dentista@clinica-catalogo.local',
            'password' => Hash::make('secret'),
            'role' => 'dentist',
            'is_active' => true,
        ]);

        Treatment::create([
            'clinic_id' => $clinic->id,
            'name' => 'Limpieza',
            'duration_minutes' => 45,
            'price_cents' => 4500,
            'is_active' => true,
        ]);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $this->getJson('/api/v1/catalog/dentists', $headers)
            ->assertOk()
            ->assertJsonFragment(['name' => 'Dentista Demo']);

        $this->getJson('/api/v1/catalog/treatments', $headers)
            ->assertOk()
            ->assertJsonFragment(['name' => 'Limpieza']);

        $this->getJson('/api/v1/users', $headers)->assertUnauthorized();
        $this->getJson('/api/v1/treatments', $headers)->assertUnauthorized();
    }
}
