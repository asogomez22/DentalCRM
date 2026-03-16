<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Models\ClinicIntegration;
use App\Models\WebhookSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EcosystemController extends Controller
{
    private const AVAILABLE_PROVIDERS = [
        ['provider' => 'google_workspace', 'label' => 'Google Workspace', 'category' => 'calendar'],
        ['provider' => 'meta_business', 'label' => 'Meta Business', 'category' => 'marketing'],
        ['provider' => 'whatsapp_business', 'label' => 'WhatsApp Business', 'category' => 'messaging'],
        ['provider' => 'stripe', 'label' => 'Stripe', 'category' => 'payments'],
        ['provider' => 'redsys', 'label' => 'Redsys', 'category' => 'payments'],
        ['provider' => 'mailchimp', 'label' => 'Mailchimp', 'category' => 'marketing'],
        ['provider' => 'zapier', 'label' => 'Zapier / Make', 'category' => 'automation'],
        ['provider' => 'holded', 'label' => 'Holded / Contabilidad', 'category' => 'finance'],
    ];

    public function integrations()
    {
        $configured = ClinicIntegration::query()->get()->keyBy('provider');

        $providers = collect(self::AVAILABLE_PROVIDERS)->map(function (array $provider) use ($configured) {
            $integration = $configured->get($provider['provider']);

            return [
                ...$provider,
                'status' => $integration?->status ?? 'disconnected',
                'last_sync_at' => $integration?->last_sync_at,
                'settings_json' => $integration?->settings_json ?? [],
            ];
        });

        return response()->json($providers->values());
    }

    public function upsertIntegration(Request $request, string $provider)
    {
        $allowedProviders = collect(self::AVAILABLE_PROVIDERS)->pluck('provider')->all();

        abort_unless(in_array($provider, $allowedProviders, true), 404);

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['disconnected', 'configured', 'active', 'paused'])],
            'settings_json' => ['nullable', 'array'],
            'last_sync_at' => ['nullable', 'date'],
        ]);

        $integration = ClinicIntegration::query()->updateOrCreate(
            ['provider' => $provider],
            $data
        );

        return response()->json($integration);
    }

    public function apiKeys()
    {
        return response()->json(
            ApiKey::query()
                ->latest('id')
                ->get()
                ->map(fn (ApiKey $key) => [
                    'id' => $key->id,
                    'name' => $key->name,
                    'scopes_json' => $key->scopes_json ?? [],
                    'last_used_at' => $key->last_used_at,
                    'is_active' => $key->is_active,
                    'created_at' => $key->created_at,
                ])
        );
    }

    public function storeApiKey(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'scopes_json' => ['nullable', 'array'],
        ]);

        $plainKey = sprintf('dcrm_%s', Str::random(40));

        $key = ApiKey::query()->create([
            'name' => $data['name'],
            'key_hash' => hash('sha256', $plainKey),
            'scopes_json' => $data['scopes_json'] ?? ['read'],
            'is_active' => true,
        ]);

        return response()->json([
            'id' => $key->id,
            'name' => $key->name,
            'token' => $plainKey,
            'scopes_json' => $key->scopes_json,
            'created_at' => $key->created_at,
        ], 201);
    }

    public function revokeApiKey(ApiKey $apiKey)
    {
        $apiKey->update(['is_active' => false]);

        return response()->json($apiKey);
    }

    public function webhooks()
    {
        return response()->json(
            WebhookSubscription::query()->latest('id')->get()
        );
    }

    public function storeWebhook(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'url' => ['required', 'url', 'max:255'],
            'secret' => ['nullable', 'string', 'max:120'],
            'events_json' => ['required', 'array', 'min:1'],
            'is_active' => ['boolean'],
        ]);

        $webhook = WebhookSubscription::query()->create($data);

        return response()->json($webhook, 201);
    }

    public function deleteWebhook(WebhookSubscription $webhookSubscription)
    {
        $webhookSubscription->delete();

        return response()->noContent();
    }

    public function openApi()
    {
        return response()->json([
            'openapi' => '3.0.0',
            'info' => [
                'title' => 'DentalCRM Public API',
                'version' => '1.0.0',
            ],
            'paths' => [
                '/api/v1/catalog/dentists' => ['get' => ['summary' => 'List public dentists']],
                '/api/v1/catalog/treatments' => ['get' => ['summary' => 'List public treatments']],
                '/api/v1/appointments/book' => ['post' => ['summary' => 'Create a public booking']],
                '/api/v1/portal/login' => ['post' => ['summary' => 'Authenticate a patient in the portal']],
            ],
        ]);
    }
}
