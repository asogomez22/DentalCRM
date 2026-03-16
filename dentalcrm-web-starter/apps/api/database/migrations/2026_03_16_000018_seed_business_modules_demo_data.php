<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $clinic = DB::table('clinics')->where('slug', 'clinica-demo')->first();

        if (!$clinic) {
            return;
        }

        $patient = DB::table('patients')->where('clinic_id', $clinic->id)->where('email', 'maria.garcia@demo.local')->first();
        $dentist = DB::table('users')->where('clinic_id', $clinic->id)->where('email', 'dentista@clinica.com')->first();
        $appointment = DB::table('appointments')->where('clinic_id', $clinic->id)->where('patient_id', $patient?->id)->first();

        $locationId = DB::table('locations')->where('clinic_id', $clinic->id)->where('name', 'Sede Centro')->value('id');
        if (!$locationId) {
            $locationId = DB::table('locations')->insertGetId([
                'clinic_id' => $clinic->id,
                'name' => 'Sede Centro',
                'address' => 'Calle Mayor 123, Madrid',
                'phone' => '+34 910 000 000',
                'email' => 'centro@clinica-demo.local',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        if ($appointment) {
            DB::table('appointments')->where('id', $appointment->id)->update([
                'location_id' => $locationId,
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('communication_templates')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'name' => 'Recordatorio 48h'],
            [
                'channel' => 'email',
                'category' => 'appointment_reminder',
                'subject' => 'Recordatorio de cita',
                'body' => 'Hola {{first_name}}, te recordamos tu proxima cita en {{date}}.',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        $campaignId = DB::table('communication_campaigns')->where('clinic_id', $clinic->id)->where('name', 'Reactivacion pacientes inactivos')->value('id');
        if (!$campaignId) {
            $campaignId = DB::table('communication_campaigns')->insertGetId([
                'clinic_id' => $clinic->id,
                'name' => 'Reactivacion pacientes inactivos',
                'channel' => 'email',
                'segment' => 'inactive_patients',
                'status' => 'draft',
                'subject' => 'Te esperamos de nuevo',
                'body' => 'Hola {{first_name}}, queremos ayudarte a retomar tu seguimiento dental.',
                'metrics_json' => json_encode([]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        if ($patient) {
            DB::table('communication_logs')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'patient_id' => $patient->id, 'subject' => 'Mensaje de bienvenida al portal'],
                [
                    'appointment_id' => $appointment?->id,
                    'campaign_id' => $campaignId,
                    'channel' => 'portal',
                    'direction' => 'outbound',
                    'status' => 'sent',
                    'body' => 'Bienvenida al portal del paciente. Desde aqui podras revisar tu documentacion y comunicarte con la clinica.',
                    'sent_at' => Carbon::now()->subHours(4),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('patient_reviews')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'patient_id' => $patient->id, 'rating' => 5],
                [
                    'appointment_id' => $appointment?->id,
                    'comment' => 'Atencion excelente y proceso de reserva muy claro.',
                    'status' => 'published',
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('patient_referrals')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'referral_code' => 'MARIA100'],
                [
                    'referrer_patient_id' => $patient->id,
                    'referred_name' => 'Carlos Ortega',
                    'referred_email' => 'carlos.ortega@example.com',
                    'referred_phone' => '+34600111223',
                    'status' => 'invited',
                    'reward_points' => 100,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('consent_records')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'patient_id' => $patient->id, 'type' => 'data_processing'],
                [
                    'status' => 'signed',
                    'signature_name' => 'Maria Garcia',
                    'ip_address' => '127.0.0.1',
                    'signed_at' => Carbon::now()->subDays(5),
                    'retention_until' => Carbon::now()->addYears(5)->toDateString(),
                    'content_snapshot' => 'Consentimiento de tratamiento de datos aceptado en onboarding.',
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('privacy_requests')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'patient_id' => $patient->id, 'type' => 'export'],
                [
                    'status' => 'requested',
                    'notes' => 'Solicitud demo de exportacion de datos.',
                    'requested_at' => Carbon::now()->subDay(),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('patients')->where('id', $patient->id)->update([
                'portal_points' => 200,
                'source' => 'public_booking',
                'last_seen_at' => Carbon::now()->subHour(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $supplierId = DB::table('suppliers')->where('clinic_id', $clinic->id)->where('name', 'Dental Supply Demo')->value('id');
        if (!$supplierId) {
            $supplierId = DB::table('suppliers')->insertGetId([
                'clinic_id' => $clinic->id,
                'name' => 'Dental Supply Demo',
                'contact_name' => 'Lucia Proveedor',
                'email' => 'pedidos@dentalsupply.local',
                'phone' => '+34 910 111 222',
                'notes' => 'Proveedor demo para stock.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $inventoryItemId = DB::table('inventory_items')->where('clinic_id', $clinic->id)->where('name', 'Guantes de nitrilo')->value('id');
        if (!$inventoryItemId) {
            $inventoryItemId = DB::table('inventory_items')->insertGetId([
                'clinic_id' => $clinic->id,
                'supplier_id' => $supplierId,
                'location_id' => $locationId,
                'sku' => 'GNT-001',
                'name' => 'Guantes de nitrilo',
                'category' => 'consumibles',
                'unit' => 'caja',
                'stock_quantity' => 120,
                'reorder_level' => 50,
                'unit_cost_cents' => 350,
                'valuation_method' => 'average',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('stock_movements')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'inventory_item_id' => $inventoryItemId, 'reference_type' => 'seed_demo'],
            [
                'type' => 'purchase',
                'quantity' => 120,
                'unit_cost_cents' => 350,
                'reference_id' => 1,
                'notes' => 'Carga inicial demo',
                'moved_at' => Carbon::now()->subDays(3),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('clinic_integrations')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'provider' => 'stripe'],
            [
                'status' => 'configured',
                'settings_json' => json_encode(['mode' => 'test', 'account_email' => 'finance@clinica-demo.local']),
                'last_sync_at' => Carbon::now()->subHours(6),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('clinic_integrations')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'provider' => 'zapier'],
            [
                'status' => 'active',
                'settings_json' => json_encode(['flows' => ['new_patient', 'invoice_paid']]),
                'last_sync_at' => Carbon::now()->subHours(2),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('webhook_subscriptions')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'name' => 'Webhook demo CRM'],
            [
                'url' => 'https://example.com/webhooks/dentalcrm',
                'secret' => 'demo-secret',
                'events_json' => json_encode(['patient.created', 'invoice.paid', 'appointment.cancelled']),
                'is_active' => true,
                'last_triggered_at' => Carbon::now()->subHours(3),
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

        DB::table('webhook_subscriptions')->where('clinic_id', $clinic->id)->where('name', 'Webhook demo CRM')->delete();
        DB::table('clinic_integrations')->where('clinic_id', $clinic->id)->whereIn('provider', ['stripe', 'zapier'])->delete();
        DB::table('stock_movements')->where('clinic_id', $clinic->id)->where('reference_type', 'seed_demo')->delete();
        DB::table('inventory_items')->where('clinic_id', $clinic->id)->where('name', 'Guantes de nitrilo')->delete();
        DB::table('suppliers')->where('clinic_id', $clinic->id)->where('name', 'Dental Supply Demo')->delete();
        DB::table('privacy_requests')->where('clinic_id', $clinic->id)->where('notes', 'Solicitud demo de exportacion de datos.')->delete();
        DB::table('consent_records')->where('clinic_id', $clinic->id)->where('signature_name', 'Maria Garcia')->delete();
        DB::table('patient_referrals')->where('clinic_id', $clinic->id)->where('referral_code', 'MARIA100')->delete();
        DB::table('patient_reviews')->where('clinic_id', $clinic->id)->where('comment', 'Atencion excelente y proceso de reserva muy claro.')->delete();
        DB::table('communication_logs')->where('clinic_id', $clinic->id)->where('subject', 'Mensaje de bienvenida al portal')->delete();
        DB::table('communication_campaigns')->where('clinic_id', $clinic->id)->where('name', 'Reactivacion pacientes inactivos')->delete();
        DB::table('communication_templates')->where('clinic_id', $clinic->id)->where('name', 'Recordatorio 48h')->delete();
        DB::table('locations')->where('clinic_id', $clinic->id)->where('name', 'Sede Centro')->delete();
    }
};
