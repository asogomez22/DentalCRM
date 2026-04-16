<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'maxilart')->value('id');

        if (!$clinicId) {
            return;
        }

        $dentistId = DB::table('users')
            ->where('clinic_id', $clinicId)
            ->where('email', 'dr.hugo.ortega@maxilart.example')
            ->value('id');

        $patientId = DB::table('patients')->where([
            'clinic_id' => $clinicId,
            'email' => 'elena.marquez@maxilart.example',
        ])->value('id');

        if (!$patientId) {
            $patientId = DB::table('patients')->insertGetId([
                'clinic_id' => $clinicId,
                'first_name' => 'Elena',
                'last_name' => 'Marquez',
                'dni' => '45126789Z',
                'email' => 'elena.marquez@maxilart.example',
                'phone' => '+34 611 204 318',
                'birth_date' => '1992-09-14',
                'notes' => 'Paciente ficticia de seguimiento estetico y revisiones.',
                'tags' => json_encode(['estetica', 'seguimiento']),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $treatment = DB::table('treatments')
            ->where('clinic_id', $clinicId)
            ->where('name', 'Higiene avanzada')
            ->first();

        $appointmentId = null;
        if ($dentistId) {
            $appointmentId = DB::table('appointments')->where([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'dentist_id' => $dentistId,
                'status' => 'confirmed',
            ])->value('id');

            if (!$appointmentId) {
                $appointmentId = DB::table('appointments')->insertGetId([
                    'clinic_id' => $clinicId,
                    'patient_id' => $patientId,
                    'dentist_id' => $dentistId,
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
        }

        $invoiceId = DB::table('invoices')->where([
            'clinic_id' => $clinicId,
            'number' => 'MAX-2026-0001',
        ])->value('id');

        if (!$invoiceId) {
            $invoiceId = DB::table('invoices')->insertGetId([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'appointment_id' => $appointmentId,
                'number' => 'MAX-2026-0001',
                'status' => 'partially_paid',
                'issued_at' => Carbon::now()->toDateString(),
                'due_at' => Carbon::now()->addDays(10)->toDateString(),
                'subtotal_cents' => 8900,
                'tax_cents' => 0,
                'total_cents' => 8900,
                'paid_cents' => 3500,
                'currency' => 'EUR',
                'notes' => 'Primera factura de seguimiento MaxilArt.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        } elseif ($appointmentId) {
            DB::table('invoices')->where('id', $invoiceId)->update([
                'appointment_id' => $appointmentId,
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('invoice_items')->updateOrInsert(
            [
                'invoice_id' => $invoiceId,
                'description' => 'Higiene avanzada',
            ],
            [
                'treatment_id' => $treatment?->id,
                'quantity' => 1,
                'unit_price_cents' => 8900,
                'total_cents' => 8900,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('payments')->updateOrInsert(
            [
                'invoice_id' => $invoiceId,
                'reference' => 'MAX-PAGO-1',
            ],
            [
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'amount_cents' => 3500,
                'method' => 'card',
                'status' => 'completed',
                'paid_at' => Carbon::now()->subDay(),
                'notes' => 'Pago inicial realizado en recepcion.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        if ($dentistId) {
            DB::table('staff_schedules')->updateOrInsert(
                [
                    'clinic_id' => $clinicId,
                    'user_id' => $dentistId,
                    'weekday' => 1,
                    'start_time' => '09:00:00',
                    'end_time' => '14:00:00',
                ],
                [
                    'location' => 'Gabinete Norte',
                    'is_available' => true,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );
        }
    }

    public function down(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'maxilart')->value('id');

        if (!$clinicId) {
            return;
        }

        $invoiceId = DB::table('invoices')->where([
            'clinic_id' => $clinicId,
            'number' => 'MAX-2026-0001',
        ])->value('id');

        if ($invoiceId) {
            DB::table('payments')->where('invoice_id', $invoiceId)->where('reference', 'MAX-PAGO-1')->delete();
            DB::table('invoice_items')->where('invoice_id', $invoiceId)->where('description', 'Higiene avanzada')->delete();
            DB::table('invoices')->where('id', $invoiceId)->delete();
        }

        DB::table('appointments')
            ->where('clinic_id', $clinicId)
            ->where('notes', 'Revision inicial y plan de tratamiento digital.')
            ->delete();

        DB::table('staff_schedules')
            ->where('clinic_id', $clinicId)
            ->where('weekday', 1)
            ->where('start_time', '09:00:00')
            ->where('end_time', '14:00:00')
            ->delete();

        DB::table('patients')
            ->where('clinic_id', $clinicId)
            ->where('email', 'elena.marquez@maxilart.example')
            ->delete();
    }
};
