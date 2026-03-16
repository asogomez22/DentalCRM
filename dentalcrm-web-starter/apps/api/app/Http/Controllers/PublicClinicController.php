<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\ClinicSetting;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PublicClinicController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'clinic_name' => ['required', 'string', 'max:180'],
            'slug' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'unique:clinics,slug'],
            'owner_name' => ['required', 'string', 'max:180'],
            'owner_email' => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:8', 'max:120'],
            'public_phone' => ['nullable', 'string', 'max:30'],
            'public_email' => ['nullable', 'email', 'max:180'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'secondary_color' => ['nullable', 'string', 'max:20'],
            'plan' => ['nullable', 'string', 'in:starter,growth,pro'],
        ]);

        [$clinic, $settings, $owner] = DB::transaction(function () use ($data) {
            $clinic = Clinic::create([
                'name' => $data['clinic_name'],
                'slug' => $data['slug'],
                'domain' => null,
                'plan' => $data['plan'] ?? 'starter',
                'is_active' => true,
            ]);

            $settings = ClinicSetting::create([
                'clinic_id' => $clinic->id,
                'brand_name' => $data['clinic_name'],
                'primary_color' => $data['primary_color'] ?? '#0f766e',
                'secondary_color' => $data['secondary_color'] ?? '#0f172a',
                'logo_url' => null,
                'public_phone' => $data['public_phone'] ?? null,
                'public_email' => $data['public_email'] ?? $data['owner_email'],
                'booking_enabled' => true,
                'settings_json' => [
                    'website' => [
                        'hero_title' => $data['clinic_name'],
                        'hero_copy' => 'Pide cita, consulta tus documentos y habla con la clinica desde una sola web.',
                    ],
                ],
            ]);

            $owner = User::create([
                'clinic_id' => $clinic->id,
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'password' => Hash::make($data['password']),
                'role' => 'admin',
                'is_active' => true,
            ]);

            foreach ([
                ['Primera visita', 30, 3500],
                ['Limpieza dental', 45, 5500],
                ['Revision completa', 30, 4000],
            ] as [$name, $duration, $price]) {
                Treatment::create([
                    'clinic_id' => $clinic->id,
                    'name' => $name,
                    'duration_minutes' => $duration,
                    'price_cents' => $price,
                    'is_active' => true,
                ]);
            }

            return [$clinic, $settings, $owner];
        });

        $token = $owner->createToken('web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $owner,
            'clinic' => [
                'id' => $clinic->id,
                'name' => $clinic->name,
                'slug' => $clinic->slug,
                'plan' => $clinic->plan,
            ],
            'settings' => [
                'brand_name' => $settings->brand_name,
                'primary_color' => $settings->primary_color,
                'secondary_color' => $settings->secondary_color,
                'public_phone' => $settings->public_phone,
                'public_email' => $settings->public_email,
                'booking_enabled' => $settings->booking_enabled,
            ],
        ], 201);
    }
}
