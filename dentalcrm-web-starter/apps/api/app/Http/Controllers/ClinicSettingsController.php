<?php

namespace App\Http\Controllers;

use App\Models\ClinicSetting;
use Illuminate\Http\Request;

class ClinicSettingsController extends Controller
{
    public function show()
    {
        $settings = $this->resolveSettings();

        return response()->json($settings);
    }

    public function publicShow()
    {
        $settings = $this->resolveSettings();

        return response()->json([
            'slug' => app('currentClinic')->slug,
            'brand_name' => $settings->brand_name,
            'primary_color' => $settings->primary_color,
            'secondary_color' => $settings->secondary_color,
            'logo_url' => $settings->logo_url,
            'public_phone' => $settings->public_phone,
            'public_email' => $settings->public_email,
            'booking_enabled' => $settings->booking_enabled,
            'website' => data_get($settings->settings_json, 'website', []),
        ]);
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
            'settings_json' => ['nullable', 'array'],
        ]);

        $settings = ClinicSetting::query()->updateOrCreate(
            ['clinic_id' => $clinicId],
            $data,
        );

        return response()->json($settings);
    }

    private function resolveSettings(): ClinicSetting
    {
        $clinicId = app('currentClinic')->id;

        return ClinicSetting::query()
            ->firstOrCreate(
                ['clinic_id' => $clinicId],
                [
                    'brand_name' => 'MaxilArt',
                    'primary_color' => '#0f766e',
                    'secondary_color' => '#0f172a',
                    'logo_url' => null,
                    'public_phone' => '+34 910 820 430',
                    'public_email' => 'hola@maxilart.example',
                    'booking_enabled' => true,
                    'settings_json' => [
                        'website' => [
                            'hero_title' => 'MaxilArt',
                            'hero_copy' => 'Cirugia oral, implantologia y estetica dental con seguimiento digital, reserva online y area privada para pacientes.',
                        ],
                    ],
                ],
            );
    }
}
