<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicSetting;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PatientPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_patient_can_log_into_the_portal_and_only_see_their_own_data(): void
    {
        Storage::fake('local');

        $clinic = Clinic::create([
            'name' => 'Clinica Portal',
            'slug' => 'clinica-portal',
            'domain' => 'clinica-portal.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        ClinicSetting::create([
            'clinic_id' => $clinic->id,
            'brand_name' => 'Portal Demo',
            'primary_color' => '#0f766e',
            'secondary_color' => '#0f172a',
            'public_phone' => '+34600999888',
            'public_email' => 'portal@clinica.local',
            'booking_enabled' => true,
        ]);

        $dentist = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Dra. Portal',
            'email' => 'dentista@clinica-portal.local',
            'password' => Hash::make('secret'),
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $treatment = Treatment::create([
            'clinic_id' => $clinic->id,
            'name' => 'Revision',
            'duration_minutes' => 30,
            'price_cents' => 3500,
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Lucia',
            'last_name' => 'Ruiz',
            'dni' => '11111111A',
            'email' => 'lucia@portal.local',
            'phone' => '+34600123456',
        ]);

        $otherPatient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Mario',
            'last_name' => 'Ajeno',
            'dni' => '22222222B',
            'email' => 'mario@portal.local',
            'phone' => '+34600777888',
        ]);

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->id,
            'dentist_id' => $dentist->id,
            'treatment_id' => $treatment->id,
            'treatment_type' => $treatment->name,
            'status' => 'confirmed',
            'starts_at' => Carbon::now()->addDays(3)->setTime(10, 0),
            'ends_at' => Carbon::now()->addDays(3)->setTime(10, 30),
        ]);

        Appointment::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $otherPatient->id,
            'dentist_id' => $dentist->id,
            'treatment_id' => $treatment->id,
            'treatment_type' => $treatment->name,
            'status' => 'confirmed',
            'starts_at' => Carbon::now()->addDays(4)->setTime(11, 0),
            'ends_at' => Carbon::now()->addDays(4)->setTime(11, 30),
        ]);

        $invoice = Invoice::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'number' => 'INV-PORTAL-0001',
            'status' => 'partially_paid',
            'issued_at' => '2026-03-16',
            'subtotal_cents' => 3500,
            'tax_cents' => 0,
            'total_cents' => 3500,
            'paid_cents' => 1000,
            'currency' => 'EUR',
        ]);

        Payment::create([
            'clinic_id' => $clinic->id,
            'invoice_id' => $invoice->id,
            'patient_id' => $patient->id,
            'amount_cents' => 1000,
            'method' => 'card',
            'status' => 'completed',
            'paid_at' => Carbon::now()->subDay(),
        ]);

        $document = Document::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->id,
            'uploaded_by' => $dentist->id,
            'category' => 'consentimiento',
            'filename' => 'consentimiento.pdf',
            'original_name' => 'consentimiento.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 2048,
            'disk' => 'local',
            'path' => 'clinics/demo/consentimiento.pdf',
        ]);

        Storage::disk('local')->put('clinics/demo/consentimiento.pdf', 'portal-demo');

        Document::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $otherPatient->id,
            'uploaded_by' => $dentist->id,
            'category' => 'privado',
            'filename' => 'otro.pdf',
            'original_name' => 'otro.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'disk' => 'local',
            'path' => 'clinics/demo/otro.pdf',
        ]);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $login = $this->postJson('/api/v1/portal/login', [
            'email' => $patient->email,
            'access_key' => '3456',
        ], $headers)->assertOk()
            ->assertJsonFragment([
                'email' => 'lucia@portal.local',
                'brand_name' => 'Portal Demo',
            ]);

        $token = $login->json('token');
        $authHeaders = [
            'X-Clinic-Slug' => $clinic->slug,
            'Authorization' => 'Bearer '.$token,
        ];

        $this->getJson('/api/v1/portal/summary', $authHeaders)
            ->assertOk()
            ->assertJsonPath('upcoming_appointments_count', 1)
            ->assertJsonPath('documents_count', 1)
            ->assertJsonPath('pending_invoices_count', 1)
            ->assertJsonPath('pending_balance_cents', 2500);

        $this->getJson('/api/v1/portal/appointments', $authHeaders)
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'id' => $appointment->id,
                'status' => 'confirmed',
            ]);

        $this->getJson('/api/v1/portal/invoices', $authHeaders)
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'number' => 'INV-PORTAL-0001',
                'paid_cents' => 1000,
            ]);

        $this->getJson('/api/v1/portal/documents', $authHeaders)
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'original_name' => 'consentimiento.pdf',
            ]);

        $this->get("/api/v1/portal/documents/{$document->id}/download", $authHeaders)->assertOk();

        $this->postJson("/api/v1/portal/appointments/{$appointment->id}/cancel", [], $authHeaders)
            ->assertOk()
            ->assertJsonFragment([
                'id' => $appointment->id,
                'status' => 'cancelled',
            ]);

        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_patient_portal_rejects_invalid_credentials_and_staff_access(): void
    {
        $clinic = Clinic::create([
            'name' => 'Clinica Portal 2',
            'slug' => 'clinica-portal-2',
            'domain' => 'clinica-portal-2.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Nora',
            'last_name' => 'Paz',
            'dni' => '33333333C',
            'email' => 'nora@portal.local',
            'phone' => '+34600666555',
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin Portal',
            'email' => 'admin@clinica-portal-2.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $this->postJson('/api/v1/portal/login', [
            'email' => $patient->email,
            'access_key' => '9999',
        ], $headers)->assertStatus(422);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/portal/summary', $headers)->assertForbidden();
    }
}
