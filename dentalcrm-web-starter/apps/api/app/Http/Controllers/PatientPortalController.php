<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicSetting;
use App\Models\CommunicationLog;
use App\Models\ConsentRecord;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\PatientReferral;
use App\Models\PatientReview;
use App\Models\PrivacyRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PatientPortalController extends Controller
{
    public function summary(Request $request)
    {
        $patient = $this->portalPatient($request);

        $upcomingAppointments = Appointment::query()
            ->where('patient_id', $patient->id)
            ->where('starts_at', '>=', now())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->with(['dentist:id,name', 'treatment:id,name'])
            ->orderBy('starts_at')
            ->get();

        $invoices = Invoice::query()
            ->where('patient_id', $patient->id)
            ->get(['id', 'status', 'total_cents', 'paid_cents']);

        return response()->json([
            'patient' => $this->transformPatient($patient),
            'clinic' => $this->publicClinicSettings(),
            'upcoming_appointments_count' => $upcomingAppointments->count(),
            'documents_count' => Document::query()->where('patient_id', $patient->id)->count(),
            'pending_invoices_count' => $invoices->where('status', '!=', 'paid')->where('status', '!=', 'cancelled')->count(),
            'pending_balance_cents' => $invoices->reduce(
                fn (int $carry, Invoice $invoice) => $carry + max($invoice->total_cents - $invoice->paid_cents, 0),
                0
            ),
            'next_appointment' => $upcomingAppointments->first(),
        ]);
    }

    public function appointments(Request $request)
    {
        $patient = $this->portalPatient($request);

        $appointments = Appointment::query()
            ->where('patient_id', $patient->id)
            ->with(['dentist:id,name', 'treatment:id,name', 'invoice:id,patient_id,number,status,total_cents,paid_cents'])
            ->orderByDesc('starts_at')
            ->get();

        return response()->json($appointments);
    }

    public function invoices(Request $request)
    {
        $patient = $this->portalPatient($request);

        $invoices = Invoice::query()
            ->where('patient_id', $patient->id)
            ->with(['items', 'payments'])
            ->orderByDesc('issued_at')
            ->get();

        return response()->json($invoices);
    }

    public function documents(Request $request)
    {
        $patient = $this->portalPatient($request);

        $documents = Document::query()
            ->where('patient_id', $patient->id)
            ->with(['uploadedBy:id,name'])
            ->latest('id')
            ->get();

        return response()->json($documents);
    }

    public function downloadDocument(Request $request, Document $document)
    {
        $patient = $this->portalPatient($request);

        if ((int) $document->patient_id !== (int) $patient->id) {
            abort(404);
        }

        return Storage::disk($document->disk)->download($document->path, $document->original_name);
    }

    public function communications(Request $request)
    {
        $patient = $this->portalPatient($request);

        return response()->json(
            CommunicationLog::query()
                ->where('patient_id', $patient->id)
                ->latest('id')
                ->get()
        );
    }

    public function sendMessage(Request $request)
    {
        $patient = $this->portalPatient($request);

        $data = $request->validate([
            'subject' => ['nullable', 'string', 'max:180'],
            'body' => ['required', 'string'],
        ]);

        $message = CommunicationLog::query()->create([
            'patient_id' => $patient->id,
            'channel' => 'portal',
            'direction' => 'inbound',
            'status' => 'received',
            'subject' => $data['subject'] ?? 'Consulta del paciente',
            'body' => $data['body'],
        ]);

        return response()->json($message, 201);
    }

    public function reviews(Request $request)
    {
        $patient = $this->portalPatient($request);

        return response()->json(
            PatientReview::query()
                ->where('patient_id', $patient->id)
                ->latest('id')
                ->get()
        );
    }

    public function storeReview(Request $request)
    {
        $patient = $this->portalPatient($request);
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'appointment_id' => ['nullable', 'integer', Rule::exists('appointments', 'id')->where('clinic_id', $clinicId)],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string'],
        ]);

        if (!empty($data['appointment_id'])) {
            $appointment = Appointment::query()->findOrFail($data['appointment_id']);
            abort_unless((int) $appointment->patient_id === (int) $patient->id, 404);
        }

        $review = PatientReview::query()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $data['appointment_id'] ?? null,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
            'status' => 'published',
        ]);

        return response()->json($review, 201);
    }

    public function referrals(Request $request)
    {
        $patient = $this->portalPatient($request);

        return response()->json(
            PatientReferral::query()
                ->where('referrer_patient_id', $patient->id)
                ->latest('id')
                ->get()
        );
    }

    public function storeReferral(Request $request)
    {
        $patient = $this->portalPatient($request);

        $data = $request->validate([
            'referred_name' => ['required', 'string', 'max:120'],
            'referred_email' => ['nullable', 'email', 'max:180'],
            'referred_phone' => ['nullable', 'string', 'max:30'],
        ]);

        $referral = PatientReferral::query()->create([
            'referrer_patient_id' => $patient->id,
            'referral_code' => strtoupper(Str::random(8)),
            'referred_name' => $data['referred_name'],
            'referred_email' => $data['referred_email'] ?? null,
            'referred_phone' => $data['referred_phone'] ?? null,
            'status' => 'invited',
            'reward_points' => 100,
        ]);

        $patient->increment('portal_points', 100);

        return response()->json($referral, 201);
    }

    public function privacyRequests(Request $request)
    {
        $patient = $this->portalPatient($request);

        return response()->json(
            PrivacyRequest::query()
                ->where('patient_id', $patient->id)
                ->latest('id')
                ->get()
        );
    }

    public function storePrivacyRequest(Request $request)
    {
        $patient = $this->portalPatient($request);

        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['export', 'delete'])],
            'notes' => ['nullable', 'string'],
        ]);

        $privacyRequest = PrivacyRequest::query()->create([
            'patient_id' => $patient->id,
            'type' => $data['type'],
            'status' => 'requested',
            'notes' => $data['notes'] ?? null,
            'requested_at' => now(),
        ]);

        return response()->json($privacyRequest, 201);
    }

    public function consents(Request $request)
    {
        $patient = $this->portalPatient($request);

        return response()->json(
            ConsentRecord::query()
                ->where('patient_id', $patient->id)
                ->with('document:id,original_name')
                ->latest('id')
                ->get()
        );
    }

    public function cancelAppointment(Request $request, Appointment $appointment)
    {
        $patient = $this->portalPatient($request);

        if ((int) $appointment->patient_id !== (int) $patient->id) {
            abort(404);
        }

        if ($appointment->starts_at->isPast() || in_array($appointment->status, ['completed', 'cancelled', 'no_show'], true)) {
            throw ValidationException::withMessages([
                'appointment' => 'This appointment can no longer be cancelled from the portal.',
            ]);
        }

        $appointment->update([
            'status' => 'cancelled',
            'notes' => trim(sprintf(
                "%s\n%s",
                (string) ($appointment->notes ?? ''),
                sprintf('Cancelled by patient from portal on %s', now()->toDateTimeString())
            )),
        ]);

        return response()->json($appointment->fresh(['dentist:id,name', 'treatment:id,name']));
    }

    private function portalPatient(Request $request): Patient
    {
        /** @var Patient $patient */
        $patient = $request->user();

        return $patient;
    }

    private function transformPatient(Patient $patient): array
    {
        return [
            'id' => $patient->id,
            'first_name' => $patient->first_name,
            'last_name' => $patient->last_name,
            'full_name' => $patient->full_name,
            'email' => $patient->email,
            'phone' => $patient->phone,
            'birth_date' => $patient->birth_date?->format('Y-m-d'),
            'notes' => $patient->notes,
            'portal_points' => (int) $patient->portal_points,
        ];
    }

    private function publicClinicSettings(): array
    {
        $clinicId = app('currentClinic')->id;

        $settings = ClinicSetting::query()
            ->firstOrCreate(
                ['clinic_id' => $clinicId],
                [
                    'brand_name' => 'Clinica Demo',
                    'primary_color' => '#0f766e',
                    'secondary_color' => '#0f172a',
                    'logo_url' => null,
                    'public_phone' => null,
                    'public_email' => null,
                    'booking_enabled' => true,
                    'settings_json' => [],
                ],
            );

        return [
            'slug' => app('currentClinic')->slug,
            'brand_name' => $settings->brand_name,
            'primary_color' => $settings->primary_color,
            'secondary_color' => $settings->secondary_color,
            'logo_url' => $settings->logo_url,
            'public_phone' => $settings->public_phone,
            'public_email' => $settings->public_email,
            'booking_enabled' => $settings->booking_enabled,
        ];
    }
}
