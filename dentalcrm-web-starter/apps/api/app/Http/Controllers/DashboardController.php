<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicSetting;
use App\Models\Patient;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function summary()
    {
        $clinicId = app('currentClinic')->id;
        $today = Carbon::today();
        $tomorrow = $today->copy()->addDay();

        $appointmentsToday = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->whereBetween('starts_at', [$today, $tomorrow])
            ->count();

        $newPatientsToday = Patient::query()
            ->where('clinic_id', $clinicId)
            ->whereBetween('created_at', [$today, $tomorrow])
            ->count();

        $estimatedRevenueCents = (int) Appointment::query()
            ->leftJoin('treatments', 'appointments.treatment_id', '=', 'treatments.id')
            ->where('appointments.clinic_id', $clinicId)
            ->where('appointments.status', 'completed')
            ->whereBetween('appointments.starts_at', [$today, $tomorrow])
            ->sum('treatments.price_cents');

        $minutesBooked = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('starts_at', [$today, $tomorrow])
            ->get()
            ->reduce(function (int $total, Appointment $appointment): int {
                return $total + max(
                    0,
                    $appointment->ends_at->clone()->diffInMinutes($appointment->starts_at),
                );
            }, 0);

        $operatingMinutes = 10 * 60; // 08:00 to 18:00 by default
        $occupancy = $operatingMinutes > 0 ? min(100, round(($minutesBooked / $operatingMinutes) * 100)) : 0;

        $settings = ClinicSetting::query()->firstOrCreate(
            ['clinic_id' => $clinicId],
            [
                'brand_name' => 'MaxilArt',
                'primary_color' => '#0f766e',
                'secondary_color' => '#0f172a',
                'public_phone' => '+34 910 820 430',
                'public_email' => 'hola@maxilart.example',
                'booking_enabled' => true,
            ],
        );

        $alerts = [];
        if ($settings->booking_enabled === false) {
            $alerts[] = 'La reserva online esta desactivada temporalmente para MaxilArt.';
        }

        if (count($alerts) === 0) {
            $alerts[] = 'Sin incidencias activas';
        }

        return response()->json([
            'date' => $today->toDateString(),
            'appointments_today' => $appointmentsToday,
            'new_patients_today' => $newPatientsToday,
            'estimated_revenue_cents' => $estimatedRevenueCents,
            'occupancy_percent' => $occupancy,
            'currency' => 'EUR',
            'alerts' => $alerts,
        ]);
    }
}
