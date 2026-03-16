<?php

namespace App\Http\Controllers;

use App\Models\ClinicSetting;
use Illuminate\Http\Request;

class ClinicSettingsController extends Controller
{
    public function show()
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

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'brand_name' => ['required', 'string', 'max:180'],
            'primary_color' => ['required', 'string', 'max:20'],
            'secondary_color' => ['required', 'string', 'max:20'],
            'logo_url' => ['nullable', 'url'],
            'public_phone' => ['nullable', 'string', 'max:30'],
            'public_email' => ['nullable', 'email', 'max:180'],
            'booking_enabled' => ['required', 'boolean'],
        ]);

        $settings = ClinicSetting::query()->updateOrCreate(
            ['clinic_id' => $clinicId],
            $data,
        );

        return response()->json($settings);
    }
}
