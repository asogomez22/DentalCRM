<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Clinic;

class SetClinicContext
{
    public function handle(Request $request, Closure $next)
    {
        $host = $request->getHost();
        $headerClinic = $request->header('X-Clinic-Slug');

        $clinicSlug = $headerClinic;

        if (!$clinicSlug && str_contains($host, '.')) {
            $clinicSlug = explode('.', $host)[0];
        }

        if (!$clinicSlug) {
            $clinicSlug = env('DENTALCRM_DEFAULT_CLINIC_SLUG', null);
        }

        if (!$clinicSlug) {
            abort(400, 'Clinic context missing.');
        }

        $clinicSlug = trim(strtolower($clinicSlug));

        // Compatibilidad con la demo antigua renombrada a MaxilArt.
        if ($clinicSlug === 'clinica-demo') {
            $clinicSlug = 'maxilart';
        }

        $clinic = Clinic::query()
            ->where(function ($query) use ($clinicSlug) {
                $query->where('slug', $clinicSlug)->orWhere('domain', $clinicSlug);
            })
            ->where('is_active', true)
            ->first();

        if (!$clinic) {
            abort(404, 'Clinic not found.');
        }

        app()->instance('currentClinic', $clinic);

        return $next($request);
    }
}
