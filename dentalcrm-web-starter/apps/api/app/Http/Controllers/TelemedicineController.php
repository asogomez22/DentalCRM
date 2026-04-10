<?php

namespace App\Http\Controllers;

use App\Models\TelemedicineSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelemedicineController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $clinicId = $request->attributes->get('clinic_id');

        $query = TelemedicineSession::where('clinic_id', $clinicId)
            ->with(['patient', 'dentist'])
            ->orderByDesc('scheduled_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->filled('dentist_id')) {
            $query->where('dentist_id', $request->dentist_id);
        }

        return response()->json($query->get());
    }

    public function show(Request $request, TelemedicineSession $session): JsonResponse
    {
        $this->authorizeClinic($request, $session->clinic_id);

        return response()->json($session->load(['patient', 'dentist', 'appointment']));
    }

    public function store(Request $request): JsonResponse
    {
        $clinicId = $request->attributes->get('clinic_id');

        $data = $request->validate([
            'patient_id'     => 'required|integer',
            'dentist_id'     => 'required|integer',
            'appointment_id' => 'nullable|integer',
            'scheduled_at'   => 'required|date',
            'provider'       => 'nullable|string|in:jitsi,whereby,zoom',
            'notes'          => 'nullable|string',
        ]);

        $session = TelemedicineSession::create([
            'clinic_id'      => $clinicId,
            'patient_id'     => $data['patient_id'],
            'dentist_id'     => $data['dentist_id'],
            'appointment_id' => $data['appointment_id'] ?? null,
            'scheduled_at'   => $data['scheduled_at'],
            'provider'       => $data['provider'] ?? 'jitsi',
            'notes'          => $data['notes'] ?? null,
            'status'         => 'scheduled',
        ]);

        return response()->json($session->load(['patient', 'dentist']), 201);
    }

    public function update(Request $request, TelemedicineSession $session): JsonResponse
    {
        $this->authorizeClinic($request, $session->clinic_id);

        $data = $request->validate([
            'scheduled_at' => 'nullable|date',
            'dentist_id'   => 'nullable|integer',
            'notes'        => 'nullable|string',
            'provider'     => 'nullable|string|in:jitsi,whereby,zoom',
        ]);

        $session->fill(array_filter($data, fn ($v) => $v !== null))->save();

        return response()->json($session->load(['patient', 'dentist']));
    }

    public function start(Request $request, TelemedicineSession $session): JsonResponse
    {
        $this->authorizeClinic($request, $session->clinic_id);

        abort_if($session->status !== 'scheduled', 422, 'Solo se puede iniciar una sesion programada.');

        $session->update(['status' => 'in_progress', 'started_at' => now()]);

        return response()->json($session->load(['patient', 'dentist']));
    }

    public function end(Request $request, TelemedicineSession $session): JsonResponse
    {
        $this->authorizeClinic($request, $session->clinic_id);

        abort_if($session->status !== 'in_progress', 422, 'Solo se puede finalizar una sesion en curso.');

        $duration = $session->started_at
            ? (int) $session->started_at->diffInMinutes(now())
            : null;

        $session->update([
            'status'           => 'completed',
            'ended_at'         => now(),
            'duration_minutes' => $duration,
            'notes'            => $request->input('notes', $session->notes),
        ]);

        return response()->json($session->load(['patient', 'dentist']));
    }

    public function cancel(Request $request, TelemedicineSession $session): JsonResponse
    {
        $this->authorizeClinic($request, $session->clinic_id);

        abort_if(
            in_array($session->status, ['completed', 'cancelled']),
            422,
            'No se puede cancelar esta sesion.'
        );

        $session->update(['status' => 'cancelled']);

        return response()->json($session->load(['patient', 'dentist']));
    }

    private function authorizeClinic(Request $request, int $resourceClinicId): void
    {
        abort_if($request->attributes->get('clinic_id') !== $resourceClinicId, 403);
    }
}
