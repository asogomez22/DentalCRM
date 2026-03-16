<?php

namespace App\Http\Middleware;

use App\Models\Patient;
use Closure;
use Illuminate\Http\Request;

class EnsurePortalPatient
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() instanceof Patient) {
            abort(403, 'Patient portal access only.');
        }

        return $next($request);
    }
}
