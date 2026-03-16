<?php

namespace App\Http\Controllers;

use App\Models\ClinicSetting;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PatientPortalAuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'access_key' => ['required', 'string', 'min:4', 'max:60'],
        ]);

        $patient = Patient::query()
            ->where('clinic_id', app('currentClinic')->id)
            ->where('email', $data['email'])
            ->first();

        if (!$patient || !$this->matchesAccessKey($patient, $data['access_key'])) {
            throw ValidationException::withMessages([
                'email' => 'Invalid patient portal credentials.',
            ]);
        }

        $patient->tokens()->where('name', 'patient-portal')->delete();

        $token = $patient->createToken('patient-portal', ['patient-portal'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'patient' => $this->transformPatient($patient),
            'clinic' => $this->publicClinicSettings(),
        ]);
    }

    public function me(Request $request)
    {
        /** @var Patient $patient */
        $patient = $request->user();

        return response()->json([
            'patient' => $this->transformPatient($patient),
            'clinic' => $this->publicClinicSettings(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    private function matchesAccessKey(Patient $patient, string $accessKey): bool
    {
        $normalizedKey = strtoupper(preg_replace('/[^A-Z0-9]/', '', $accessKey) ?? '');
        $digitsOnlyKey = preg_replace('/\D/', '', $accessKey) ?? '';
        $phoneDigits = preg_replace('/\D/', '', $patient->phone ?? '') ?? '';
        $dni = strtoupper(preg_replace('/[^A-Z0-9]/', '', $patient->dni ?? '') ?? '');

        if ($dni && hash_equals($dni, $normalizedKey)) {
            return true;
        }

        if (!$phoneDigits || !$digitsOnlyKey) {
            return false;
        }

        return hash_equals($phoneDigits, $digitsOnlyKey) || str_ends_with($phoneDigits, $digitsOnlyKey);
    }

    private function transformPatient(Patient $patient): array
    {
        return [
            'id' => $patient->id,
            'first_name' => $patient->first_name,
            'last_name' => $patient->last_name,
            'full_name' => $patient->full_name,
            'email' => $patient->email,
            'phone' => $patient->phone,
            'birth_date' => $patient->birth_date?->format('Y-m-d'),
            'portal_points' => (int) $patient->portal_points,
        ];
    }

    private function publicClinicSettings(): array
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

        return [
            'slug' => app('currentClinic')->slug,
            'brand_name' => $settings->brand_name,
            'primary_color' => $settings->primary_color,
            'secondary_color' => $settings->secondary_color,
            'logo_url' => $settings->logo_url,
            'public_phone' => $settings->public_phone,
            'public_email' => $settings->public_email,
            'booking_enabled' => $settings->booking_enabled,
        ];
    }
}
