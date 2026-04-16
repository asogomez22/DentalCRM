<?php

namespace App\Http\Controllers;

use App\Models\StaffSchedule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffScheduleController extends Controller
{
    public function index(Request $request)
    {
        $schedules = StaffSchedule::query()
            ->with(['user:id,name,role'])
            ->when($request->filled('user_id'), fn ($query) => $query->where('user_id', $request->integer('user_id')))
            ->orderBy('weekday')
            ->orderBy('start_time')
            ->get();

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        $clinicId = app('currentClinic')->id;
        $data = $this->validateSchedule($request, $clinicId);

        $schedule = StaffSchedule::create($data);

        return response()->json($schedule->load('user'), 201);
    }

    public function update(Request $request, StaffSchedule $staffSchedule)
    {
        $clinicId = app('currentClinic')->id;
        $data = $this->validateSchedule($request, $clinicId, true);

        $staffSchedule->update($data);

        return response()->json($staffSchedule->load('user'));
    }

    public function destroy(StaffSchedule $staffSchedule)
    {
        $staffSchedule->delete();

        return response()->noContent();
    }

    private function validateSchedule(Request $request, int $clinicId, bool $partial = false): array
    {
        $rules = [
            'user_id' => [
                $partial ? 'sometimes' : 'required',
                'required',
                'integer',
                Rule::exists('users', 'id')->where('clinic_id', $clinicId),
            ],
            'weekday' => [$partial ? 'sometimes' : 'required', 'required', 'integer', 'between:0,6'],
            'start_time' => [$partial ? 'sometimes' : 'required', 'required', 'date_format:H:i'],
            'end_time' => [$partial ? 'sometimes' : 'required', 'required', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:120'],
            'is_available' => [$partial ? 'sometimes' : 'required', 'boolean'],
        ];

        $data = $request->validate($rules);
        $start = $data['start_time'] ?? null;
        $end = $data['end_time'] ?? null;

        if ($start && $end && $end <= $start) {
            throw ValidationException::withMessages([
                'end_time' => 'The end time must be after the start time.',
            ]);
        }

        return $data;
    }
}
