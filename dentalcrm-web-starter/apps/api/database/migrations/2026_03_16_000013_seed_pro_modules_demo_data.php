<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'clinica-demo')->value('id');

        if (!$clinicId) {
            return;
        }

        $dentistId = DB::table('users')
            ->where('clinic_id', $clinicId)
            ->where('email', 'dentista@clinica.com')
            ->value('id');

        $patientId = DB::table('patients')->where([
            'clinic_id' => $clinicId,
            'email' => 'maria.garcia@demo.local',
        ])->value('id');

        if (!$patientId) {
            $patientId = DB::table('patients')->insertGetId([
                'clinic_id' => $clinicId,
                'first_name' => 'Maria',
                'last_name' => 'Garcia',
                'dni' => '12345678A',
                'email' => 'maria.garcia@demo.local',
                'phone' => '+34600123456',
                'birth_date' => '1990-05-10',
                'notes' => 'Paciente demo para pruebas de facturacion y documentos.',
                'tags' => json_encode(['demo', 'pro']),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $treatment = DB::table('treatments')
            ->where('clinic_id', $clinicId)
            ->where('name', 'Limpieza')
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
                    'room' => 'Gabinete 1',
                    'status' => 'confirmed',
                    'starts_at' => Carbon::now()->addDays(2)->setTime(11, 0, 0),
                    'ends_at' => Carbon::now()->addDays(2)->setTime(11, 45, 0),
                    'notes' => 'Cita demo para portal del paciente.',
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);
            }
        }

        $invoiceId = DB::table('invoices')->where([
            'clinic_id' => $clinicId,
            'number' => 'INV-DEMO-2026-0001',
        ])->value('id');

        if (!$invoiceId) {
            $invoiceId = DB::table('invoices')->insertGetId([
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'appointment_id' => $appointmentId,
                'number' => 'INV-DEMO-2026-0001',
                'status' => 'partially_paid',
                'issued_at' => Carbon::now()->toDateString(),
                'due_at' => Carbon::now()->addDays(10)->toDateString(),
                'subtotal_cents' => 4500,
                'tax_cents' => 0,
                'total_cents' => 4500,
                'paid_cents' => 2000,
                'currency' => 'EUR',
                'notes' => 'Factura demo inicial',
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
                'description' => 'Limpieza dental demo',
            ],
            [
                'treatment_id' => $treatment?->id,
                'quantity' => 1,
                'unit_price_cents' => 4500,
                'total_cents' => 4500,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('payments')->updateOrInsert(
            [
                'invoice_id' => $invoiceId,
                'reference' => 'DEMO-PAGO-1',
            ],
            [
                'clinic_id' => $clinicId,
                'patient_id' => $patientId,
                'amount_cents' => 2000,
                'method' => 'card',
                'status' => 'completed',
                'paid_at' => Carbon::now()->subDay(),
                'notes' => 'Pago parcial demo',
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
                    'location' => 'Gabinete 1',
                    'is_available' => true,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );
        }
    }

    public function down(): void
    {
        $clinicId = DB::table('clinics')->where('slug', 'clinica-demo')->value('id');

        if (!$clinicId) {
            return;
        }

        $invoiceId = DB::table('invoices')->where([
            'clinic_id' => $clinicId,
            'number' => 'INV-DEMO-2026-0001',
        ])->value('id');

        if ($invoiceId) {
            DB::table('payments')->where('invoice_id', $invoiceId)->where('reference', 'DEMO-PAGO-1')->delete();
            DB::table('invoice_items')->where('invoice_id', $invoiceId)->where('description', 'Limpieza dental demo')->delete();
            DB::table('invoices')->where('id', $invoiceId)->delete();
        }

        DB::table('appointments')
            ->where('clinic_id', $clinicId)
            ->where('notes', 'Cita demo para portal del paciente.')
            ->delete();

        DB::table('staff_schedules')
            ->where('clinic_id', $clinicId)
            ->where('weekday', 1)
            ->where('start_time', '09:00:00')
            ->where('end_time', '14:00:00')
            ->delete();

        DB::table('patients')
            ->where('clinic_id', $clinicId)
            ->where('email', 'maria.garcia@demo.local')
            ->delete();
    }
};
