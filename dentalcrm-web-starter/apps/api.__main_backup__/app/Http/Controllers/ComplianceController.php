<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\CommunicationLog;
use App\Models\ConsentRecord;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\PatientReferral;
use App\Models\PatientReview;
use App\Models\PrivacyRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ComplianceController extends Controller
{
    public function auditLogs(Request $request)
    {
        $logs = AuditLog::query()
            ->when($request->filled('action'), fn ($query) => $query->where('action', 'like', '%'.$request->input('action').'%'))
            ->latest('id')
            ->limit(300)
            ->get();

        return response()->json($logs);
    }

    public function consents(Request $request)
    {
        $consents = ConsentRecord::query()
            ->with(['patient:id,first_name,last_name', 'document:id,original_name'])
            ->when($request->filled('patient_id'), fn ($query) => $query->where('patient_id', $request->integer('patient_id')))
            ->latest('id')
            ->get();

        return response()->json($consents);
    }

    public function storeConsent(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'document_id' => ['nullable', 'integer', Rule::exists('documents', 'id')->where('clinic_id', $clinicId)],
            'type' => ['required', 'string', Rule::in(['data_processing', 'treatment', 'marketing'])],
            'status' => ['required', 'string', Rule::in(['pending', 'signed', 'revoked'])],
            'signature_name' => ['nullable', 'string', 'max:160'],
            'signed_at' => ['nullable', 'date'],
            'retention_until' => ['nullable', 'date'],
            'content_snapshot' => ['nullable', 'string'],
        ]);

        $consent = ConsentRecord::query()->create([
            ...$data,
            'ip_address' => $request->ip(),
        ]);

        return response()->json($consent->load(['patient:id,first_name,last_name', 'document:id,original_name']), 201);
    }

    public function updateConsent(Request $request, ConsentRecord $consentRecord)
    {
        $data = $request->validate([
            'status' => ['sometimes', 'required', 'string', Rule::in(['pending', 'signed', 'revoked'])],
            'signature_name' => ['nullable', 'string', 'max:160'],
            'signed_at' => ['nullable', 'date'],
            'retention_until' => ['nullable', 'date'],
            'content_snapshot' => ['nullable', 'string'],
        ]);

        $consentRecord->update([
            ...$data,
            'ip_address' => $request->ip(),
        ]);

        return response()->json($consentRecord->load(['patient:id,first_name,last_name', 'document:id,original_name']));
    }

    public function privacyRequests(Request $request)
    {
        $privacyRequests = PrivacyRequest::query()
            ->with('patient:id,first_name,last_name,email')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->latest('id')
            ->get();

        return response()->json($privacyRequests);
    }

    public function updatePrivacyRequest(Request $request, PrivacyRequest $privacyRequest)
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['requested', 'processing', 'resolved', 'rejected'])],
            'notes' => ['nullable', 'string'],
        ]);

        $privacyRequest->update([
            ...$data,
            'resolved_at' => $data['status'] === 'resolved' ? now() : $privacyRequest->resolved_at,
        ]);

        return response()->json($privacyRequest->load('patient:id,first_name,last_name,email'));
    }

    public function exportPatientData(Patient $patient)
    {
        $payload = [
            'patient' => $patient->only([
                'id',
                'first_name',
                'last_name',
                'email',
                'phone',
                'birth_date',
                'source',
                'marketing_opt_in',
                'portal_points',
                'created_at',
            ]),
            'appointments' => Appointment::query()->where('patient_id', $patient->id)->get(),
            'invoices' => Invoice::query()->with(['items', 'payments'])->where('patient_id', $patient->id)->get(),
            'documents' => Document::query()->where('patient_id', $patient->id)->get(['id', 'category', 'original_name', 'mime_type', 'created_at']),
            'communications' => CommunicationLog::query()->where('patient_id', $patient->id)->get(['id', 'channel', 'direction', 'status', 'subject', 'created_at']),
            'reviews' => PatientReview::query()->where('patient_id', $patient->id)->get(),
            'referrals' => PatientReferral::query()->where('referrer_patient_id', $patient->id)->get(),
            'privacy_requests' => PrivacyRequest::query()->where('patient_id', $patient->id)->get(),
            'consents' => ConsentRecord::query()->where('patient_id', $patient->id)->get(),
        ];

        return response()->streamDownload(function () use ($payload) {
            echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }, sprintf('patient-export-%s.json', $patient->id), [
            'Content-Type' => 'application/json',
        ]);
    }
}
