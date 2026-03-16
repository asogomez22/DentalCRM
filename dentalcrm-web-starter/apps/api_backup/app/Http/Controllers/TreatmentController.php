<?php

namespace App\Http\Controllers;

use App\Models\Treatment;
use Illuminate\Http\Request;

class TreatmentController extends Controller
{
    public function index(Request $request)
    {
        $clinicId = app('currentClinic')->id;
        $rawActive = $request->input('is_active');
        $requestedActive = is_null($rawActive) ? null : filter_var($rawActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        $treatments = Treatment::query()
            ->where('clinic_id', $clinicId)
            ->when(!is_null($requestedActive), function ($query) use ($requestedActive) {
                $query->where('is_active', $requestedActive);
            }, function ($query) {
                $query->where('is_active', true);
            })
            ->orderBy('name')
            ->get();

        return response()->json($treatments);
    }
}
