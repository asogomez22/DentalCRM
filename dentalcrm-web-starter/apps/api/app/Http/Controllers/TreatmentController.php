<?php

namespace App\Http\Controllers;

use App\Models\Treatment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TreatmentController extends Controller
{
    public function index(Request $request)
    {
        $clinicId = app('currentClinic')->id;
        $includeInactive = $request->boolean('include_inactive');
        $rawActive = $request->input('is_active');
        $requestedActive = is_null($rawActive) ? null : filter_var($rawActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        $query = Treatment::query()
            ->where('clinic_id', $clinicId)
            ->orderBy('name');

        if (!$includeInactive) {
            $query->when(!is_null($requestedActive), function ($builder) use ($requestedActive) {
                $builder->where('is_active', $requestedActive);
            }, function ($builder) {
                $builder->where('is_active', true);
            });
        }

        $treatments = $query->get();

        return response()->json($treatments);
    }

    public function publicIndex(): JsonResponse
    {
        $clinicId = app('currentClinic')->id;

        $treatments = Treatment::query()
            ->where('clinic_id', $clinicId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($treatments);
    }
}
