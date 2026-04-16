<?php

namespace App\Http\Controllers;

use App\Models\CommunicationCampaign;
use App\Models\CommunicationLog;
use App\Models\CommunicationTemplate;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CommunicationsController extends Controller
{
    public function templates(Request $request)
    {
        $templates = CommunicationTemplate::query()
            ->when($request->filled('channel'), fn ($query) => $query->where('channel', $request->input('channel')))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->input('category')))
            ->orderBy('channel')
            ->orderBy('name')
            ->get();

        return response()->json($templates);
    }

    public function storeTemplate(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'channel' => ['required', 'string', Rule::in(['email', 'sms', 'whatsapp', 'portal'])],
            'category' => ['required', 'string', 'max:60'],
            'subject' => ['nullable', 'string', 'max:180'],
            'body' => ['required', 'string'],
            'is_active' => ['boolean'],
        ]);

        $template = CommunicationTemplate::query()->create($data);

        return response()->json($template, 201);
    }

    public function updateTemplate(Request $request, CommunicationTemplate $communicationTemplate)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'channel' => ['sometimes', 'required', 'string', Rule::in(['email', 'sms', 'whatsapp', 'portal'])],
            'category' => ['sometimes', 'required', 'string', 'max:60'],
            'subject' => ['nullable', 'string', 'max:180'],
            'body' => ['sometimes', 'required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $communicationTemplate->update($data);

        return response()->json($communicationTemplate);
    }

    public function campaigns()
    {
        $campaigns = CommunicationCampaign::query()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($campaigns);
    }

    public function storeCampaign(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'channel' => ['required', 'string', Rule::in(['email', 'sms', 'whatsapp', 'portal'])],
            'segment' => ['required', 'string', Rule::in(['all_patients', 'inactive_patients', 'birthdays', 'pending_invoices'])],
            'subject' => ['nullable', 'string', 'max:180'],
            'body' => ['required', 'string'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $campaign = CommunicationCampaign::query()->create([
            ...$data,
            'status' => empty($data['scheduled_at']) ? 'draft' : 'scheduled',
        ]);

        return response()->json($campaign, 201);
    }

    public function sendCampaign(CommunicationCampaign $communicationCampaign)
    {
        $patients = $this->segmentPatients($communicationCampaign->segment);

        DB::transaction(function () use ($communicationCampaign, $patients) {
            foreach ($patients as $patient) {
                CommunicationLog::query()->create([
                    'patient_id' => $patient->id,
                    'campaign_id' => $communicationCampaign->id,
                    'channel' => $communicationCampaign->channel,
                    'direction' => 'outbound',
                    'status' => 'sent',
                    'subject' => $communicationCampaign->subject,
                    'body' => $this->interpolateBody($communicationCampaign->body, $patient),
                    'sent_at' => now(),
                ]);
            }

            $communicationCampaign->update([
                'status' => 'sent',
                'sent_at' => now(),
                'metrics_json' => [
                    'audience_size' => $patients->count(),
                    'sent' => $patients->count(),
                ],
            ]);
        });

        return response()->json($communicationCampaign->fresh());
    }

    public function logs(Request $request)
    {
        $logs = CommunicationLog::query()
            ->with(['patient:id,first_name,last_name', 'campaign:id,name'])
            ->when($request->filled('patient_id'), fn ($query) => $query->where('patient_id', $request->integer('patient_id')))
            ->when($request->filled('channel'), fn ($query) => $query->where('channel', $request->input('channel')))
            ->when($request->filled('direction'), fn ($query) => $query->where('direction', $request->input('direction')))
            ->latest('id')
            ->get();

        return response()->json($logs);
    }

    public function storeLog(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'appointment_id' => ['nullable', 'integer', Rule::exists('appointments', 'id')->where('clinic_id', $clinicId)],
            'invoice_id' => ['nullable', 'integer', Rule::exists('invoices', 'id')->where('clinic_id', $clinicId)],
            'channel' => ['required', 'string', Rule::in(['email', 'sms', 'whatsapp', 'portal'])],
            'direction' => ['required', 'string', Rule::in(['outbound', 'inbound'])],
            'status' => ['nullable', 'string', Rule::in(['draft', 'queued', 'sent', 'delivered', 'opened', 'failed', 'received'])],
            'subject' => ['nullable', 'string', 'max:180'],
            'body' => ['required', 'string'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $log = CommunicationLog::query()->create([
            ...$data,
            'status' => $data['status'] ?? ($data['direction'] === 'inbound' ? 'received' : 'sent'),
            'sent_at' => ($data['direction'] ?? 'outbound') === 'outbound' ? now() : null,
        ]);

        return response()->json($log->load('patient:id,first_name,last_name'), 201);
    }

    private function segmentPatients(string $segment)
    {
        $query = Patient::query();

        return match ($segment) {
            'inactive_patients' => $query
                ->where(function ($builder) {
                    $builder->whereNull('last_seen_at')
                        ->orWhere('last_seen_at', '<', now()->subMonths(6));
                })
                ->get(),
            'birthdays' => $query
                ->whereMonth('birth_date', now()->month)
                ->get(),
            'pending_invoices' => $query
                ->whereIn('id', Invoice::query()
                    ->whereNotIn('status', ['paid', 'cancelled'])
                    ->pluck('patient_id'))
                ->get(),
            default => $query->where('marketing_opt_in', true)->get(),
        };
    }

    private function interpolateBody(string $body, Patient $patient): string
    {
        return strtr($body, [
            '{{first_name}}' => $patient->first_name,
            '{{last_name}}' => $patient->last_name,
            '{{full_name}}' => $patient->full_name,
            '{{date}}' => Carbon::now()->format('Y-m-d'),
        ]);
    }
}
