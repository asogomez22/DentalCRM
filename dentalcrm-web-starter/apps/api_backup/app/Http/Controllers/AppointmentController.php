<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Treatment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->input('date');
        $from = $request->input('from');
        $to = $request->input('to');

        $appointments = Appointment::query()
            ->when($date, function ($query) use ($date) {
                $query->whereDate('starts_at', Carbon::parse($date)->toDateString());
            })
            ->when($request->filled('dentist_id'), fn ($q) => $q->where('dentist_id', $request->integer('dentist_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($from, fn ($q) => $q->where('starts_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('ends_at', '<=', $to))
            ->with(['patient:id,first_name,last_name', 'dentist:id,name', 'treatment:id,name'])
            ->orderBy('starts_at')
            ->get();

        return response()->json($appointments);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['required', 'integer'],
            'dentist_id' => ['required', 'integer'],
            'treatment_id' => ['nullable', 'integer'],
            'treatment_type' => ['nullable', 'string', 'max:120'],
            'room' => ['nullable', 'string', 'max:80'],
            'status' => ['required', 'string', 'max:40'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string'],
        ]);

        $appointment = Appointment::create($data);

        return response()->json($appointment, 201);
    }

    public function update(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer'],
            'dentist_id' => ['sometimes', 'required', 'integer'],
            'treatment_id' => ['nullable', 'integer'],
            'treatment_type' => ['nullable', 'string', 'max:120'],
            'room' => ['nullable', 'string', 'max:80'],
            'status' => ['sometimes', 'required', 'string', 'max:40'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['sometimes', 'required', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string'],
        ]);

        $appointment->update($data);

        return response()->json($appointment);
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();

        return response()->json([], 204);
    }

    public function availability(Request $request)
    {
        $date = Carbon::parse($request->input('date', now()));
        $dentistId = $request->integer('dentist_id') ?: null;
        $treatmentId = $request->integer('treatment_id') ?: null;

        $durationMinutes = 30;
        if ($treatmentId) {
            $durationMinutes = Treatment::query()->find($treatmentId)?->duration_minutes ?? $durationMinutes;
        }

        $clinicId = app('currentClinic')->id;
        $startHour = 9;
        $endHour = 19;
        $existing = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->whereDate('starts_at', $date->toDateString())
            ->where('status', '!=', 'cancelled')
            ->when($dentistId, fn ($query) => $query->where('dentist_id', $dentistId))
            ->get(['starts_at', 'ends_at']);

        $slots = [];
        $windowStart = $date->copy()->setTime($startHour, 0, 0);
        $windowEnd = $date->copy()->setTime($endHour, 0, 0);

        while ($windowStart < $windowEnd) {
            $windowFinish = $windowStart->copy()->addMinutes($durationMinutes);

            $isBusy = $existing->contains(function (Appointment $appointment) use ($windowStart, $windowFinish) {
                return $windowStart->lt($appointment->ends_at) && $windowFinish->gt($appointment->starts_at);
            });

            if (!$isBusy) {
                $slots[] = [
                    'starts_at' => $windowStart->toIso8601String(),
                    'ends_at' => $windowFinish->toIso8601String(),
                    'room' => null,
                    'dentist_id' => $dentistId,
                    'treatment_id' => $treatmentId,
                ];
            }

            $windowStart = $windowStart->addMinutes($durationMinutes);
        }

        return response()->json($slots);
    }

    public function publicBook(Request $request)
    {
        $data = $request->validate([
            'patient.first_name' => ['required', 'string', 'max:120'],
            'patient.last_name' => ['required', 'string', 'max:120'],
            'patient.email' => ['required', 'email'],
            'patient.phone' => ['required', 'string', 'max:30'],
            'dentist_id' => ['required', 'integer'],
            'treatment_id' => ['nullable', 'integer'],
            'slot' => ['required', 'date'],
        ]);

        $patient = Patient::firstOrCreate(
            [
                'email' => $data['patient']['email'],
                'clinic_id' => app('currentClinic')->id,
            ],
            [
                'first_name' => $data['patient']['first_name'],
                'last_name' => $data['patient']['last_name'],
                'phone' => $data['patient']['phone'],
            ]
        );

        $start = Carbon::parse($data['slot']);
        $durationMinutes = 30;
        if (!empty($data['treatment_id'])) {
            $durationMinutes = Treatment::query()->find($data['treatment_id'])?->duration_minutes ?? $durationMinutes;
        }
        $treatmentType = null;
        if (!empty($data['treatment_id'])) {
            $treatmentType = Treatment::query()->where('id', $data['treatment_id'])->value('name');
        }

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'dentist_id' => $data['dentist_id'],
            'treatment_id' => $data['treatment_id'] ?? null,
            'treatment_type' => $treatmentType,
            'status' => 'pending',
            'starts_at' => $start,
            'ends_at' => $start->copy()->addMinutes(max(1, (int) $durationMinutes)),
        ]);

        return response()->json($appointment->load('patient:id,first_name,last_name'), 201);
    }
}
