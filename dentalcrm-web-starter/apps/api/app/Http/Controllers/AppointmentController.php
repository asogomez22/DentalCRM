<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicSetting;
use App\Models\CommunicationLog;
use App\Models\Location;
use App\Models\Patient;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    private const ALLOWED_STATUSES = [
        'pending',
        'confirmed',
        'completed',
        'cancelled',
        'in_progress',
        'no_show',
    ];

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
            ->when($request->filled('location_id'), fn ($q) => $q->where('location_id', $request->integer('location_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($from, fn ($q) => $q->where('starts_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('ends_at', '<=', $to))
            ->with(['patient:id,first_name,last_name', 'dentist:id,name', 'treatment:id,name', 'location:id,name'])
            ->orderBy('starts_at')
            ->get();

        return response()->json($appointments);
    }

    public function store(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'dentist_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) use ($clinicId) {
                    $query->where('clinic_id', $clinicId)
                        ->where('role', 'dentist')
                        ->where('is_active', true);
                }),
            ],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('clinic_id', $clinicId)],
            'treatment_id' => ['nullable', 'integer', Rule::exists('treatments', 'id')->where('clinic_id', $clinicId)],
            'treatment_type' => ['nullable', 'string', 'max:120'],
            'room' => ['nullable', 'string', 'max:80'],
            'status' => ['required', 'string', 'max:40', Rule::in(self::ALLOWED_STATUSES)],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string'],
        ]);

        $this->ensureSlotAvailable((int) $data['dentist_id'], $data['starts_at'], $data['ends_at']);

        $appointment = Appointment::create($data);

        return response()->json($appointment->load(['patient:id,first_name,last_name', 'dentist:id,name', 'treatment:id,name', 'location:id,name']), 201);
    }

    public function update(Request $request, Appointment $appointment)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'dentist_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) use ($clinicId) {
                    $query->where('clinic_id', $clinicId)
                        ->where('role', 'dentist')
                        ->where('is_active', true);
                }),
            ],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('clinic_id', $clinicId)],
            'treatment_id' => ['nullable', 'integer', Rule::exists('treatments', 'id')->where('clinic_id', $clinicId)],
            'treatment_type' => ['nullable', 'string', 'max:120'],
            'room' => ['nullable', 'string', 'max:80'],
            'status' => ['sometimes', 'required', 'string', 'max:40', Rule::in(self::ALLOWED_STATUSES)],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['sometimes', 'required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $startsAt = array_key_exists('starts_at', $data) ? $data['starts_at'] : $appointment->starts_at;
        $endsAt = array_key_exists('ends_at', $data) ? $data['ends_at'] : $appointment->ends_at;

        if (Carbon::parse($endsAt)->lte(Carbon::parse($startsAt))) {
            throw ValidationException::withMessages([
                'ends_at' => 'The end time must be after the start time.',
            ]);
        }

        $dentistId = (int) ($data['dentist_id'] ?? $appointment->dentist_id);
        $this->ensureSlotAvailable($dentistId, $startsAt, $endsAt, $appointment->id);

        $appointment->update($data);

        return response()->json($appointment->load(['patient:id,first_name,last_name', 'dentist:id,name', 'treatment:id,name', 'location:id,name']));
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();

        return response()->noContent();
    }

    public function availability(Request $request)
    {
        $this->ensurePublicBookingEnabled();

        $clinicId = app('currentClinic')->id;
        $data = $request->validate([
            'date' => ['nullable', 'date'],
            'dentist_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) use ($clinicId) {
                    $query->where('clinic_id', $clinicId)
                        ->where('role', 'dentist')
                        ->where('is_active', true);
                }),
            ],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('clinic_id', $clinicId)],
            'treatment_id' => ['nullable', 'integer', Rule::exists('treatments', 'id')->where('clinic_id', $clinicId)],
        ]);

        $date = Carbon::parse($data['date'] ?? now());
        $dentistId = isset($data['dentist_id']) ? (int) $data['dentist_id'] : null;
        $locationId = isset($data['location_id']) ? (int) $data['location_id'] : null;
        $treatmentId = isset($data['treatment_id']) ? (int) $data['treatment_id'] : null;

        $durationMinutes = 30;
        if ($treatmentId) {
            $durationMinutes = Treatment::query()->find($treatmentId)?->duration_minutes ?? $durationMinutes;
        }

        $startHour = 9;
        $endHour = 19;
        $existing = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->whereDate('starts_at', $date->toDateString())
            ->when($locationId, fn ($query) => $query->where('location_id', $locationId))
            ->where('status', '!=', 'cancelled')
            ->get(['dentist_id', 'starts_at', 'ends_at']);

        $dentistIds = $dentistId
            ? collect([$dentistId])
            : User::query()
                ->where('clinic_id', $clinicId)
                ->where('role', 'dentist')
                ->where('is_active', true)
                ->orderBy('name')
                ->pluck('id');

        $slots = [];
        foreach ($dentistIds as $currentDentistId) {
            $windowStart = $date->copy()->setTime($startHour, 0, 0);
            $windowEnd = $date->copy()->setTime($endHour, 0, 0);
            $dentistAppointments = $existing->where('dentist_id', (int) $currentDentistId);

            while ($windowStart < $windowEnd) {
                $windowFinish = $windowStart->copy()->addMinutes($durationMinutes);

                $isBusy = $dentistAppointments->contains(function (Appointment $appointment) use ($windowStart, $windowFinish) {
                    return $windowStart->lt($appointment->ends_at) && $windowFinish->gt($appointment->starts_at);
                });

                if (!$isBusy) {
                    $slots[] = [
                        'starts_at' => $windowStart->toIso8601String(),
                        'ends_at' => $windowFinish->toIso8601String(),
                        'room' => null,
                        'dentist_id' => (int) $currentDentistId,
                        'location_id' => $locationId,
                        'treatment_id' => $treatmentId,
                    ];
                }

                $windowStart = $windowStart->addMinutes($durationMinutes);
            }
        }

        usort($slots, function (array $left, array $right) {
            return [$left['starts_at'], $left['dentist_id']] <=> [$right['starts_at'], $right['dentist_id']];
        });

        return response()->json(array_values($slots));
    }

    public function publicBook(Request $request)
    {
        $this->ensurePublicBookingEnabled();

        $clinicId = app('currentClinic')->id;
        $data = $request->validate([
            'patient.first_name' => ['required', 'string', 'max:120'],
            'patient.last_name' => ['required', 'string', 'max:120'],
            'patient.email' => ['required', 'email'],
            'patient.phone' => ['required', 'string', 'max:30'],
            'dentist_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(function ($query) use ($clinicId) {
                    $query->where('clinic_id', $clinicId)
                        ->where('role', 'dentist')
                        ->where('is_active', true);
                }),
            ],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('clinic_id', $clinicId)],
            'treatment_id' => ['nullable', 'integer', Rule::exists('treatments', 'id')->where('clinic_id', $clinicId)],
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

        $patient->fill([
            'first_name' => $data['patient']['first_name'],
            'last_name' => $data['patient']['last_name'],
            'phone' => $data['patient']['phone'],
            'source' => $patient->source ?: 'public_booking',
            'last_seen_at' => now(),
        ]);

        if ($patient->isDirty()) {
            $patient->save();
        }

        $start = Carbon::parse($data['slot']);
        $durationMinutes = 30;
        $treatment = null;
        if (!empty($data['treatment_id'])) {
            $treatment = Treatment::query()->find($data['treatment_id']);
            $durationMinutes = $treatment?->duration_minutes ?? $durationMinutes;
        }
        $treatmentType = $treatment?->name;
        $end = $start->copy()->addMinutes(max(1, (int) $durationMinutes));

        $this->ensureSlotAvailable((int) $data['dentist_id'], $start, $end);

        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'dentist_id' => $data['dentist_id'],
            'location_id' => $data['location_id'] ?? null,
            'treatment_id' => $data['treatment_id'] ?? null,
            'treatment_type' => $treatmentType,
            'status' => 'pending',
            'starts_at' => $start,
            'ends_at' => $end,
        ]);

        CommunicationLog::query()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'channel' => 'email',
            'direction' => 'outbound',
            'status' => 'sent',
            'subject' => 'Confirmacion de reserva',
            'body' => sprintf('Hola %s, tu reserva para el %s ha sido registrada.', $patient->first_name, $start->format('d/m/Y H:i')),
            'sent_at' => now(),
        ]);

        return response()->json($appointment->load(['patient:id,first_name,last_name', 'location:id,name']), 201);
    }

    private function ensurePublicBookingEnabled(): void
    {
        $clinicId = app('currentClinic')->id;

        $settings = ClinicSetting::query()
            ->where('clinic_id', $clinicId)
            ->first();

        if ($settings && $settings->booking_enabled === false) {
            abort(403, 'Public booking is disabled for this clinic.');
        }
    }

    private function ensureSlotAvailable(int $dentistId, string|Carbon $startsAt, string|Carbon $endsAt, ?int $ignoreAppointmentId = null): void
    {
        $clinicId = app('currentClinic')->id;
        $start = $startsAt instanceof Carbon ? $startsAt : Carbon::parse($startsAt);
        $end = $endsAt instanceof Carbon ? $endsAt : Carbon::parse($endsAt);

        $conflict = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->where('dentist_id', $dentistId)
            ->where('status', '!=', 'cancelled')
            ->when($ignoreAppointmentId, fn ($query) => $query->whereKeyNot($ignoreAppointmentId))
            ->where(function ($query) use ($start, $end) {
                $query->where('starts_at', '<', $end)
                    ->where('ends_at', '>', $start);
            })
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'slot' => 'The selected slot is no longer available.',
            ]);
        }
    }
}
