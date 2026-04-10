<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $clinic = DB::table('clinics')->where('slug', 'maxilart')->first();

        if (!$clinic) {
            return;
        }

        $patient = DB::table('patients')->where('clinic_id', $clinic->id)->where('email', 'elena.marquez@maxilart.example')->first();
        $dentist = DB::table('users')->where('clinic_id', $clinic->id)->where('email', 'dr.hugo.ortega@maxilart.example')->first();
        $appointment = DB::table('appointments')->where('clinic_id', $clinic->id)->where('patient_id', $patient?->id)->first();

        $locationId = DB::table('locations')->where('clinic_id', $clinic->id)->where('name', 'MaxilArt Chamberi')->value('id');
        if (!$locationId) {
            $locationId = DB::table('locations')->insertGetId([
                'clinic_id' => $clinic->id,
                'name' => 'MaxilArt Chamberi',
                'address' => 'Avenida del Arte 24, Madrid',
                'phone' => '+34 910 820 430',
                'email' => 'chamberi@maxilart.example',
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
            ['clinic_id' => $clinic->id, 'name' => 'Recordatorio preconsulta'],
            [
                'channel' => 'email',
                'category' => 'appointment_reminder',
                'subject' => 'Tu cita en MaxilArt',
                'body' => 'Hola {{first_name}}, te recordamos tu proxima cita en MaxilArt el {{date}}.',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        $campaignId = DB::table('communication_campaigns')->where('clinic_id', $clinic->id)->where('name', 'Seguimiento de primeras visitas')->value('id');
        if (!$campaignId) {
            $campaignId = DB::table('communication_campaigns')->insertGetId([
                'clinic_id' => $clinic->id,
                'name' => 'Seguimiento de primeras visitas',
                'channel' => 'email',
                'segment' => 'inactive_patients',
                'status' => 'draft',
                'subject' => 'Continuamos con tu plan',
                'body' => 'Hola {{first_name}}, en MaxilArt queremos acompanarte en tu siguiente paso del tratamiento.',
                'metrics_json' => json_encode([]),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        if ($patient) {
            DB::table('communication_logs')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'patient_id' => $patient->id, 'subject' => 'Bienvenida a tu area privada'],
                [
                    'appointment_id' => $appointment?->id,
                    'campaign_id' => $campaignId,
                    'channel' => 'portal',
                    'direction' => 'outbound',
                    'status' => 'sent',
                    'body' => 'Bienvenida al area privada de MaxilArt. Desde aqui podras revisar tu documentacion y escribirnos cuando lo necesites.',
                    'sent_at' => Carbon::now()->subHours(4),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('patient_reviews')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'patient_id' => $patient->id, 'rating' => 5],
                [
                    'appointment_id' => $appointment?->id,
                    'comment' => 'Trato impecable y explicaciones muy claras en cada visita.',
                    'status' => 'published',
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ],
            );

            DB::table('patient_referrals')->updateOrInsert(
                ['clinic_id' => $clinic->id, 'referral_code' => 'ELENA100'],
                [
                    'referrer_patient_id' => $patient->id,
                    'referred_name' => 'Diego Pastor',
                    'referred_email' => 'diego.pastor@maxilart.example',
                    'referred_phone' => '+34 611 208 441',
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
                    'signature_name' => 'Elena Marquez',
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
                    'notes' => 'Solicitud inicial de exportacion de historial clinico.',
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

        $supplierId = DB::table('suppliers')->where('clinic_id', $clinic->id)->where('name', 'Arcadia Dental Supply')->value('id');
        if (!$supplierId) {
            $supplierId = DB::table('suppliers')->insertGetId([
                'clinic_id' => $clinic->id,
                'name' => 'Arcadia Dental Supply',
                'contact_name' => 'Sonia Bernal',
                'email' => 'pedidos@arcadiadental.example',
                'phone' => '+34 910 555 220',
                'notes' => 'Proveedor principal de consumibles y escaneado.',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $inventoryItemId = DB::table('inventory_items')->where('clinic_id', $clinic->id)->where('name', 'Guantes de nitrilo talla M')->value('id');
        if (!$inventoryItemId) {
            $inventoryItemId = DB::table('inventory_items')->insertGetId([
                'clinic_id' => $clinic->id,
                'supplier_id' => $supplierId,
                'location_id' => $locationId,
                'sku' => 'GNT-MAX-001',
                'name' => 'Guantes de nitrilo talla M',
                'category' => 'consumibles',
                'unit' => 'caja',
                'stock_quantity' => 120,
                'reorder_level' => 40,
                'unit_cost_cents' => 420,
                'valuation_method' => 'average',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        DB::table('stock_movements')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'inventory_item_id' => $inventoryItemId, 'reference_type' => 'seed_maxilart'],
            [
                'type' => 'purchase',
                'quantity' => 120,
                'unit_cost_cents' => 420,
                'reference_id' => 1,
                'notes' => 'Carga inicial de apertura.',
                'moved_at' => Carbon::now()->subDays(3),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        );

        DB::table('clinic_integrations')->updateOrInsert(
            ['clinic_id' => $clinic->id, 'provider' => 'stripe'],
            [
                'status' => 'configured',
                'settings_json' => json_encode(['mode' => 'test', 'account_email' => 'finanzas@maxilart.example']),
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
            ['clinic_id' => $clinic->id, 'name' => 'Webhook MaxilArt Hub'],
            [
                'url' => 'https://example.com/webhooks/maxilart',
                'secret' => 'maxilart-sync-key',
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
        $clinic = DB::table('clinics')->where('slug', 'maxilart')->first();

        if (!$clinic) {
            return;
        }

        DB::table('webhook_subscriptions')->where('clinic_id', $clinic->id)->where('name', 'Webhook MaxilArt Hub')->delete();
        DB::table('clinic_integrations')->where('clinic_id', $clinic->id)->whereIn('provider', ['stripe', 'zapier'])->delete();
        DB::table('stock_movements')->where('clinic_id', $clinic->id)->where('reference_type', 'seed_maxilart')->delete();
        DB::table('inventory_items')->where('clinic_id', $clinic->id)->where('name', 'Guantes de nitrilo talla M')->delete();
        DB::table('suppliers')->where('clinic_id', $clinic->id)->where('name', 'Arcadia Dental Supply')->delete();
        DB::table('privacy_requests')->where('clinic_id', $clinic->id)->where('notes', 'Solicitud inicial de exportacion de historial clinico.')->delete();
        DB::table('consent_records')->where('clinic_id', $clinic->id)->where('signature_name', 'Elena Marquez')->delete();
        DB::table('patient_referrals')->where('clinic_id', $clinic->id)->where('referral_code', 'ELENA100')->delete();
        DB::table('patient_reviews')->where('clinic_id', $clinic->id)->where('comment', 'Trato impecable y explicaciones muy claras en cada visita.')->delete();
        DB::table('communication_logs')->where('clinic_id', $clinic->id)->where('subject', 'Bienvenida a tu area privada')->delete();
        DB::table('communication_campaigns')->where('clinic_id', $clinic->id)->where('name', 'Seguimiento de primeras visitas')->delete();
        DB::table('communication_templates')->where('clinic_id', $clinic->id)->where('name', 'Recordatorio preconsulta')->delete();
        DB::table('locations')->where('clinic_id', $clinic->id)->where('name', 'MaxilArt Chamberi')->delete();
    }
};
