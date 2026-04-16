<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Document;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentsAndSchedulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_lifecycle_and_schedule_creation_work_for_the_current_clinic(): void
    {
        Storage::fake('local');

        $clinic = Clinic::create([
            'name' => 'Clinica Documental',
            'slug' => 'clinica-documental',
            'domain' => 'clinica-documental.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin Docs',
            'email' => 'admin@clinica-documental.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $dentist = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Dentista Docs',
            'email' => 'dentista@clinica-documental.local',
            'password' => Hash::make('secret'),
            'role' => 'dentist',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Mario',
            'last_name' => 'Lopez',
            'email' => 'mario@clinica-documental.local',
            'phone' => '+34600000333',
        ]);

        Sanctum::actingAs($admin);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $upload = $this->postJson('/api/v1/documents', [
            'patient_id' => $patient->id,
            'category' => 'consentimiento',
            'file' => UploadedFile::fake()->create('consentimiento.pdf', 120, 'application/pdf'),
        ], $headers);

        $upload->assertCreated()
            ->assertJsonFragment([
                'patient_id' => $patient->id,
                'category' => 'consentimiento',
                'original_name' => 'consentimiento.pdf',
            ]);

        $documentId = $upload->json('id');
        $document = Document::findOrFail($documentId);

        Storage::disk('local')->assertExists($document->path);

        $this->get("/api/v1/documents/{$documentId}/download", $headers)->assertOk();

        $this->postJson('/api/v1/staff-schedules', [
            'user_id' => $dentist->id,
            'weekday' => 2,
            'start_time' => '10:00',
            'end_time' => '15:00',
            'location' => 'Gabinete 2',
            'is_available' => true,
        ], $headers)->assertCreated()
            ->assertJsonFragment([
                'user_id' => $dentist->id,
                'weekday' => 2,
                'location' => 'Gabinete 2',
            ]);

        $this->getJson('/api/v1/staff-schedules', $headers)
            ->assertOk()
            ->assertJsonFragment([
                'user_id' => $dentist->id,
                'weekday' => 2,
            ]);

        $this->deleteJson("/api/v1/documents/{$documentId}", [], $headers)->assertNoContent();

        Storage::disk('local')->assertMissing($document->path);
        $this->assertDatabaseMissing('documents', ['id' => $documentId]);
    }

    public function test_schedule_creation_rejects_users_from_another_clinic(): void
    {
        $clinicA = Clinic::create([
            'name' => 'Clinica Horarios A',
            'slug' => 'clinica-horarios-a',
            'domain' => 'clinica-horarios-a.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $clinicB = Clinic::create([
            'name' => 'Clinica Horarios B',
            'slug' => 'clinica-horarios-b',
            'domain' => 'clinica-horarios-b.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinicA->id,
            'name' => 'Admin Horarios',
            'email' => 'admin@clinica-horarios-a.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $foreignUser = User::create([
            'clinic_id' => $clinicB->id,
            'name' => 'Dentista Externo',
            'email' => 'dentista@clinica-horarios-b.local',
            'password' => Hash::make('secret'),
            'role' => 'dentist',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/staff-schedules', [
            'user_id' => $foreignUser->id,
            'weekday' => 1,
            'start_time' => '09:00',
            'end_time' => '13:00',
            'is_available' => true,
        ], [
            'X-Clinic-Slug' => $clinicA->slug,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['user_id']);
    }
}
