<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration {
    public function up(): void
    {
        $clinic = DB::table('clinics')->where('slug', 'maxilart')->first();

        if (!$clinic) {
            return;
        }

        $patient = DB::table('patients')
            ->where('clinic_id', $clinic->id)
            ->where('email', 'elena.marquez@maxilart.example')
            ->first();

        $dentist = DB::table('users')
            ->where('clinic_id', $clinic->id)
            ->where('email', 'dr.hugo.ortega@maxilart.example')
            ->first();

        $treatment = DB::table('treatments')
            ->where('clinic_id', $clinic->id)
            ->where('name', 'Higiene avanzada')
            ->first();

        if (!$patient || !$dentist) {
            return;
        }

        $appointmentId = DB::table('appointments')
            ->where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->id)
            ->where('notes', 'Revision inicial y plan de tratamiento digital.')
            ->value('id');

        if (!$appointmentId) {
            $appointmentId = DB::table('appointments')->insertGetId([
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->id,
                'dentist_id' => $dentist->id,
                'treatment_id' => $treatment?->id,
                'treatment_type' => $treatment?->name,
                'room' => 'Gabinete Norte',
                'status' => 'confirmed',
                'starts_at' => Carbon::now()->addDays(2)->setTime(11, 0, 0),
                'ends_at' => Carbon::now()->addDays(2)->setTime(12, 0, 0),
                'notes' => 'Revision inicial y plan de tratamiento digital.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('invoices')
            ->where('clinic_id', $clinic->id)
            ->where('number', 'MAX-2026-0001')
            ->update([
                'appointment_id' => $appointmentId,
                'updated_at' => Carbon::now(),
            ]);

        $path = "clinics/{$clinic->id}/patients/{$patient->id}/documents/bienvenida-maxilart.txt";

        if (!Storage::disk('local')->exists($path)) {
            Storage::disk('local')->put(
                $path,
                "Bienvenida al area privada de MaxilArt.\nAccede para revisar tus citas, documentos y facturas.\n"
            );
        }

        DB::table('documents')->updateOrInsert(
            [
                'clinic_id' => $clinic->id,
                'patient_id' => $patient->id,
                'original_name' => 'bienvenida-maxilart.txt',
            ],
            [
                'uploaded_by' => $dentist->id,
                'category' => 'portal',
                'filename' => 'bienvenida-maxilart.txt',
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
        $clinic = DB::table('clinics')->where('slug', 'maxilart')->first();

        if (!$clinic) {
            return;
        }

        $patient = DB::table('patients')
            ->where('clinic_id', $clinic->id)
            ->where('email', 'elena.marquez@maxilart.example')
            ->first();

        if (!$patient) {
            return;
        }

        $path = "clinics/{$clinic->id}/patients/{$patient->id}/documents/bienvenida-maxilart.txt";

        DB::table('documents')
            ->where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->id)
            ->where('original_name', 'bienvenida-maxilart.txt')
            ->delete();

        DB::table('appointments')
            ->where('clinic_id', $clinic->id)
            ->where('patient_id', $patient->id)
            ->where('notes', 'Revision inicial y plan de tratamiento digital.')
            ->delete();

        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
    }
};
