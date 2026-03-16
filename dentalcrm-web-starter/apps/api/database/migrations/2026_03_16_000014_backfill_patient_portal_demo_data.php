<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration {
    public function up(): void
    {
        $clinic = DB::table('clinics')->where('slug', 'clinica-demo')->first();

        if (!$clinic) {
            return;
        }

        $patient = DB::table('patients')
            ->where('clinic_id', $clinic->id)
            ->where('email', 'maria.garcia@demo.local')
            ->first();

        $dentist = DB::table('users')
            ->where('clinic_id', $clinic->id)
            ->where('email', 'dentista@clinica.com')
            ->first();

        $treatment = DB::table('treatments')
            ->where('clinic_id', $clinic->id)
            ->where('name', 'Limpieza')
            ->first();

        if (!$patient || !$dentist) {
            return;
        }

        $appointmentId = DB::table('appointments')
            ->where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->id)
            ->where('notes', 'Cita demo para portal del paciente.')
            ->value('id');

        if (!$appointmentId) {
            $appointmentId = DB::table('appointments')->insertGetId([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->id,
                'dentist_id' => $dentist->id,
                'treatment_id' => $treatment?->id,
                'treatment_type' => $treatment?->name,
                'room' => 'Gabinete 1',
                'status' => 'confirmed',
                'starts_at' => Carbon::now()->addDays(2)->setTime(11, 0, 0),
                'ends_at' => Carbon::now()->addDays(2)->setTime(11, 45, 0),
                'notes' => 'Cita demo para portal del paciente.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('invoices')
            ->where('clinic_id', $clinic->id)
            ->where('number', 'INV-DEMO-2026-0001')
            ->update([
                'appointment_id' => $appointmentId,
                'updated_at' => Carbon::now(),
            ]);

        $path = "clinics/{$clinic->id}/patients/{$patient->id}/documents/bienvenida-portal.txt";

        if (!Storage::disk('local')->exists($path)) {
            Storage::disk('local')->put(
                $path,
                "Bienvenida al portal del paciente de Clinica Demo.\nAccede para revisar tus citas, documentos y facturas.\n"
            );
        }

        DB::table('documents')->updateOrInsert(
            [
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->id,
                'original_name' => 'bienvenida-portal.txt',
            ],
            [
                'uploaded_by' => $dentist->id,
                'category' => 'portal',
                'filename' => 'bienvenida-portal.txt',
                'mime_type' => 'text/plain',
                'size_bytes' => Storage::disk('local')->size($path),
                'disk' => 'local',
                'path' => $path,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );
    }

    public function down(): void
    {
        $clinic = DB::table('clinics')->where('slug', 'clinica-demo')->first();

        if (!$clinic) {
            return;
        }

        $patient = DB::table('patients')
            ->where('clinic_id', $clinic->id)
            ->where('email', 'maria.garcia@demo.local')
            ->first();

        if (!$patient) {
            return;
        }

        $path = "clinics/{$clinic->id}/patients/{$patient->id}/documents/bienvenida-portal.txt";

        DB::table('documents')
            ->where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->id)
            ->where('original_name', 'bienvenida-portal.txt')
            ->delete();

        DB::table('appointments')
            ->where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->id)
            ->where('notes', 'Cita demo para portal del paciente.')
            ->delete();

        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
    }
};
