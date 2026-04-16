<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_and_payment_workflow_updates_totals_and_status(): void
    {
        $clinic = Clinic::create([
            'name' => 'Clinica Finanzas',
            'slug' => 'clinica-finanzas',
            'domain' => 'clinica-finanzas.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin Finanzas',
            'email' => 'admin@clinica-finanzas.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Laura',
            'last_name' => 'Perez',
            'email' => 'laura@clinica-finanzas.local',
            'phone' => '+34600000111',
        ]);

        $treatment = Treatment::create([
            'clinic_id' => $clinic->id,
            'name' => 'Implante',
            'duration_minutes' => 90,
            'price_cents' => 12000,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $createInvoice = $this->postJson('/api/v1/invoices', [
            'patient_id' => $patient->id,
            'issued_at' => '2026-03-16',
            'items' => [
                [
                    'treatment_id' => $treatment->id,
                    'description' => 'Implante unitario',
                    'quantity' => 1,
                    'unit_price_cents' => 12000,
                ],
            ],
        ], $headers);

        $createInvoice->assertCreated()
            ->assertJsonFragment([
                'patient_id' => $patient->id,
                'status' => 'pending',
                'total_cents' => 12000,
                'paid_cents' => 0,
            ]);

        $invoiceId = $createInvoice->json('id');

        $this->postJson('/api/v1/payments', [
            'invoice_id' => $invoiceId,
            'amount_cents' => 12000,
            'method' => 'card',
            'status' => 'completed',
            'paid_at' => '2026-03-16 10:00:00',
            'reference' => 'TPV-0001',
        ], $headers)->assertCreated()
            ->assertJsonFragment([
                'invoice_id' => $invoiceId,
                'patient_id' => $patient->id,
                'amount_cents' => 12000,
            ]);

        $this->getJson("/api/v1/invoices/{$invoiceId}", $headers)
            ->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('paid_cents', 12000)
            ->assertJsonPath('total_cents', 12000);

        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'status' => 'paid',
            'paid_cents' => 12000,
        ]);
    }

    public function test_invoice_creation_rejects_foreign_patient_and_treatment_ids(): void
    {
        $clinicA = Clinic::create([
            'name' => 'Clinica A',
            'slug' => 'clinica-a-fin',
            'domain' => 'clinica-a-fin.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $clinicB = Clinic::create([
            'name' => 'Clinica B',
            'slug' => 'clinica-b-fin',
            'domain' => 'clinica-b-fin.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinicA->id,
            'name' => 'Admin A',
            'email' => 'admin@clinica-a-fin.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $foreignPatient = Patient::create([
            'clinic_id' => $clinicB->id,
            'first_name' => 'Paciente',
            'last_name' => 'Ajeno',
            'email' => 'paciente@clinica-b-fin.local',
            'phone' => '+34600000222',
        ]);

        $foreignTreatment = Treatment::create([
            'clinic_id' => $clinicB->id,
            'name' => 'Extraccion',
            'duration_minutes' => 45,
            'price_cents' => 5000,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/invoices', [
            'patient_id' => $foreignPatient->id,
            'issued_at' => '2026-03-16',
            'items' => [
                [
                    'treatment_id' => $foreignTreatment->id,
                    'description' => 'Intento cruzado',
                    'quantity' => 1,
                    'unit_price_cents' => 5000,
                ],
            ],
        ], [
            'X-Clinic-Slug' => $clinicA->slug,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['patient_id', 'items.0.treatment_id']);

        $this->assertDatabaseMissing('invoices', ['clinic_id' => $clinicA->id]);
    }
}
