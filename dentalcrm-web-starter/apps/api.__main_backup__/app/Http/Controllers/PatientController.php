<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->string('search')->toString();
        $from = $request->input('last_visit_from');
        $to = $request->input('last_visit_to');
        $searchOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $patients = Patient::query()
            ->when($from, fn ($query) => $query->whereHas('appointments', function ($appointmentsQuery) use ($from) {
                $appointmentsQuery->whereDate('ends_at', '>=', Carbon::parse($from)->toDateString());
            }))
            ->when($to, fn ($query) => $query->whereHas('appointments', function ($appointmentsQuery) use ($to) {
                $appointmentsQuery->whereDate('ends_at', '<=', Carbon::parse($to)->toDateString());
            }))
            ->when($search, function ($query) use ($search, $searchOperator) {
                $query->where(function ($inner) use ($search, $searchOperator) {
                    $inner->where('first_name', $searchOperator, "%{$search}%")
                        ->orWhere('last_name', $searchOperator, "%{$search}%")
                        ->orWhere('dni', $searchOperator, "%{$search}%")
                        ->orWhere('phone', $searchOperator, "%{$search}%");
                });
            })
            ->latest('id')
            ->paginate(min((int) $request->input('per_page', 15), 50));

        return response()->json($patients);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'dni' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'birth_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $patient = Patient::create($data);

        return response()->json($patient, 201);
    }

    public function show(Patient $patient)
    {
        return response()->json($patient);
    }

    public function update(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:120'],
            'last_name' => ['sometimes', 'required', 'string', 'max:120'],
            'dni' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'birth_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $patient->update($data);

        return response()->json($patient);
    }
}
