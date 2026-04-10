<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Patient;
use App\Models\PrivacyRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessModulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_run_communications_and_read_reports(): void
    {
        $clinic = Clinic::create([
            'name' => 'Clinica Growth',
            'slug' => 'clinica-growth',
            'domain' => 'clinica-growth.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin Growth',
            'email' => 'admin@clinica-growth.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Marta',
            'last_name' => 'Navas',
            'email' => 'marta@clinica-growth.local',
            'phone' => '+34600000001',
            'source' => 'instagram',
            'marketing_opt_in' => true,
        ]);

        Sanctum::actingAs($admin);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $this->postJson('/api/v1/communications/templates', [
            'name' => 'Recuperacion',
            'channel' => 'email',
            'category' => 'retention',
            'subject' => 'Te echamos de menos',
            'body' => 'Hola {{first_name}}, queremos verte de nuevo.',
            'is_active' => true,
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'Recuperacion',
            'channel' => 'email',
        ]);

        $campaign = $this->postJson('/api/v1/communications/campaigns', [
            'name' => 'Winback marzo',
            'channel' => 'email',
            'segment' => 'all_patients',
            'subject' => 'Volvamos a cuidar tu sonrisa',
            'body' => 'Hola {{first_name}}, reserva tu revision.',
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'Winback marzo',
            'status' => 'draft',
        ]);

        $campaignId = $campaign->json('id');

        $this->postJson("/api/v1/communications/campaigns/{$campaignId}/send", [], $headers)
            ->assertOk()
            ->assertJsonFragment([
                'id' => $campaignId,
                'status' => 'sent',
            ]);

        $this->getJson('/api/v1/communications/logs', $headers)
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'patient_id' => $patient->id,
                'channel' => 'email',
                'direction' => 'outbound',
                'status' => 'sent',
            ]);

        $this->getJson('/api/v1/reports/summary', $headers)
            ->assertOk()
            ->assertJsonStructure([
                'executive' => ['mrr_cents', 'arr_cents', 'ltv_cents', 'occupancy_percent', 'collection_rate_percent', 'nps', 'no_show_rate_percent'],
                'operational' => ['appointments_today', 'pending_confirmations', 'production_by_dentist', 'monthly_new_patients_by_source', 'treatments', 'communications' => ['sent', 'received', 'opened', 'failed'], 'low_stock_items'],
                'financial' => ['payments_this_month_cents', 'overdue_invoices', 'quarter_projection_cents'],
                'benchmarks' => ['no_show_sector_avg_percent', 'retention_top_decile_percent', 'avg_treatment_price_percentile'],
            ])
            ->assertJsonPath('operational.communications.sent', 1);
    }

    public function test_staff_can_manage_operations_ecosystem_and_compliance(): void
    {
        $clinic = Clinic::create([
            'name' => 'Clinica Ops',
            'slug' => 'clinica-ops',
            'domain' => 'clinica-ops.local',
            'plan' => 'pro',
            'is_active' => true,
        ]);

        $admin = User::create([
            'clinic_id' => $clinic->id,
            'name' => 'Admin Ops',
            'email' => 'admin@clinica-ops.local',
            'password' => Hash::make('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $patient = Patient::create([
            'clinic_id' => $clinic->id,
            'first_name' => 'Diego',
            'last_name' => 'Lara',
            'email' => 'diego@clinica-ops.local',
            'phone' => '+34600000002',
        ]);

        Sanctum::actingAs($admin);

        $headers = ['X-Clinic-Slug' => $clinic->slug];

        $location = $this->postJson('/api/v1/operations/locations', [
            'name' => 'Sede Norte',
            'address' => 'Avenida Norte 123',
            'phone' => '+34910000001',
            'email' => 'norte@clinica-ops.local',
            'is_active' => true,
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'Sede Norte',
        ]);

        $supplier = $this->postJson('/api/v1/operations/suppliers', [
            'name' => 'Proveedor Dental',
            'contact_name' => 'Paula',
            'email' => 'compras@proveedor.local',
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'Proveedor Dental',
        ]);

        $locationId = $location->json('id');
        $supplierId = $supplier->json('id');

        $inventoryItem = $this->postJson('/api/v1/operations/inventory/items', [
            'name' => 'Mascarillas',
            'category' => 'consumibles',
            'unit' => 'caja',
            'stock_quantity' => 10,
            'reorder_level' => 5,
            'unit_cost_cents' => 450,
            'supplier_id' => $supplierId,
            'location_id' => $locationId,
            'valuation_method' => 'average',
            'is_active' => true,
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'Mascarillas',
        ]);

        $itemId = $inventoryItem->json('id');

        $this->postJson('/api/v1/operations/inventory/movements', [
            'inventory_item_id' => $itemId,
            'type' => 'purchase',
            'quantity' => 4,
            'unit_cost_cents' => 500,
            'notes' => 'Reposicion marzo',
        ], $headers)->assertCreated()->assertJsonFragment([
            'inventory_item_id' => $itemId,
            'type' => 'purchase',
        ]);

        $this->putJson('/api/v1/ecosystem/integrations/stripe', [
            'status' => 'configured',
            'settings_json' => ['mode' => 'test'],
        ], $headers)->assertOk()->assertJsonFragment([
            'provider' => 'stripe',
            'status' => 'configured',
        ]);

        $apiKey = $this->postJson('/api/v1/ecosystem/api-keys', [
            'name' => 'ERP Sync',
            'scopes_json' => ['read', 'write'],
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'ERP Sync',
        ]);

        $apiKeyId = $apiKey->json('id');

        $this->deleteJson("/api/v1/ecosystem/api-keys/{$apiKeyId}", [], $headers)
            ->assertOk()
            ->assertJsonFragment([
                'id' => $apiKeyId,
                'is_active' => false,
            ]);

        $webhook = $this->postJson('/api/v1/ecosystem/webhooks', [
            'name' => 'ERP webhook',
            'url' => 'https://example.com/webhooks/erp',
            'secret' => 'test-secret',
            'events_json' => ['patient.created', 'invoice.paid'],
            'is_active' => true,
        ], $headers)->assertCreated()->assertJsonFragment([
            'name' => 'ERP webhook',
        ]);

        $webhookId = $webhook->json('id');

        $this->postJson('/api/v1/compliance/consents', [
            'patient_id' => $patient->id,
            'type' => 'treatment',
            'status' => 'pending',
            'content_snapshot' => 'Consentimiento de tratamiento.',
        ], $headers)->assertCreated()->assertJsonFragment([
            'patient_id' => $patient->id,
            'type' => 'treatment',
        ]);

        $privacyRequest = PrivacyRequest::create([
            'clinic_id' => $clinic->id,
            'patient_id' => $patient->id,
            'type' => 'export',
            'status' => 'requested',
            'requested_at' => now(),
        ]);

        $this->putJson("/api/v1/compliance/privacy-requests/{$privacyRequest->id}", [
            'status' => 'resolved',
            'notes' => 'Exportacion entregada',
        ], $headers)->assertOk()->assertJsonFragment([
            'id' => $privacyRequest->id,
            'status' => 'resolved',
        ]);

        $this->getJson('/api/v1/compliance/audit-logs', $headers)
            ->assertOk()
            ->assertJsonFragment([
                'action' => 'POST api/v1/operations/locations',
            ]);

        $export = $this->get("/api/v1/compliance/patients/{$patient->id}/export", $headers)->assertOk();
        $this->assertStringContainsString('diego@clinica-ops.local', $export->streamedContent());

        $this->getJson('/api/v1/openapi', $headers)
            ->assertOk()
            ->assertJsonPath('info.title', 'MaxilArt Public API');

        $this->deleteJson("/api/v1/ecosystem/webhooks/{$webhookId}", [], $headers)->assertNoContent();
    }
}
