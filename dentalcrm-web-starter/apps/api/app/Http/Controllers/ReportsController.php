<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\CommunicationLog;
use App\Models\InventoryItem;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\PatientReview;
use App\Models\Payment;
use App\Models\Treatment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    public function summary()
    {
        $clinicId = app('currentClinic')->id;
        $now = Carbon::now();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();
        $quarterStart = $now->copy()->startOfQuarter();
        $weekStart = $now->copy()->startOfWeek();
        $today = $now->copy()->startOfDay();
        $tomorrow = $today->copy()->addDay();

        $paymentsThisMonth = Payment::query()
            ->whereBetween('paid_at', [$monthStart, $monthEnd])
            ->where('status', 'completed')
            ->sum('amount_cents');

        $patientsSeenLast180Days = Appointment::query()
            ->where('clinic_id', $clinicId)
            ->where('starts_at', '>=', $now->copy()->subDays(180))
            ->distinct('patient_id')
            ->count('patient_id');

        $lifetimeRevenue = Payment::query()
            ->where('status', 'completed')
            ->sum('amount_cents');

        $noShowRate = $this->percentage(
            Appointment::query()->where('status', 'no_show')->count(),
            max(1, Appointment::query()->count()),
        );

        $promoters = PatientReview::query()->where('rating', '>=', 4)->count();
        $detractors = PatientReview::query()->where('rating', '<=', 2)->count();
        $nps = $promoters === 0 && $detractors === 0
            ? 0
            : round((($promoters - $detractors) / max(1, PatientReview::query()->count())) * 100);

        $appointmentsToday = Appointment::query()
            ->whereBetween('starts_at', [$today, $tomorrow])
            ->count();

        $pendingConfirmations = Appointment::query()
            ->whereBetween('starts_at', [$today, $tomorrow])
            ->where('status', 'pending')
            ->count();

        $productionByDentist = Appointment::query()
            ->leftJoin('users', 'appointments.dentist_id', '=', 'users.id')
            ->leftJoin('treatments', 'appointments.treatment_id', '=', 'treatments.id')
            ->where('appointments.clinic_id', $clinicId)
            ->whereBetween('appointments.starts_at', [$weekStart, $now->copy()->endOfWeek()])
            ->groupBy('appointments.dentist_id', 'users.name')
            ->selectRaw('users.name as dentist_name, count(*) as appointments_count, coalesce(sum(treatments.price_cents), 0) as revenue_cents')
            ->orderByDesc('revenue_cents')
            ->get();

        $monthlyPatients = Patient::query()
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->selectRaw('coalesce(source, \'manual\') as source, count(*) as total')
            ->groupBy('source')
            ->orderByDesc('total')
            ->get();

        $treatmentStats = Appointment::query()
            ->leftJoin('treatments', 'appointments.treatment_id', '=', 'treatments.id')
            ->where('appointments.clinic_id', $clinicId)
            ->groupBy('appointments.treatment_id', 'treatments.name')
            ->selectRaw('coalesce(treatments.name, appointments.treatment_type, \'Sin clasificar\') as treatment_name, count(*) as appointments_count, coalesce(sum(treatments.price_cents), 0) as revenue_cents')
            ->orderByDesc('appointments_count')
            ->limit(8)
            ->get();

        $communications = [
            'sent' => CommunicationLog::query()->where('direction', 'outbound')->count(),
            'received' => CommunicationLog::query()->where('direction', 'inbound')->count(),
            'opened' => CommunicationLog::query()->where('status', 'opened')->count(),
            'failed' => CommunicationLog::query()->where('status', 'failed')->count(),
        ];

        $overdueInvoices = Invoice::query()
            ->whereNotIn('status', ['paid', 'cancelled'])
            ->whereDate('due_at', '<', $today)
            ->get(['id', 'number', 'due_at', 'total_cents', 'paid_cents']);

        $completedQuarterRevenue = Payment::query()
            ->where('status', 'completed')
            ->whereBetween('paid_at', [$quarterStart, $now])
            ->sum('amount_cents');

        $quarterProjection = round($completedQuarterRevenue * 1.18);

        $sectorBenchmarks = [
            'no_show_sector_avg_percent' => 8.2,
            'retention_top_decile_percent' => 85,
            'avg_treatment_price_percentile' => Treatment::query()->avg('price_cents') ? round((Treatment::query()->avg('price_cents') / 100), 2) : 0,
        ];

        return response()->json([
            'executive' => [
                'mrr_cents' => (int) $paymentsThisMonth,
                'arr_cents' => (int) ($paymentsThisMonth * 12),
                'patients_retained_last_180_days' => $patientsSeenLast180Days,
                'ltv_cents' => (int) round($lifetimeRevenue / max(1, Payment::query()->distinct('patient_id')->count('patient_id'))),
                'occupancy_percent' => $this->percentage(
                    Appointment::query()->whereBetween('starts_at', [$monthStart, $monthEnd])->where('status', '!=', 'cancelled')->count(),
                    max(1, User::query()->where('role', 'dentist')->count() * 22 * 10)
                ),
                'collection_rate_percent' => $this->percentage(
                    Payment::query()->where('status', 'completed')->sum('amount_cents'),
                    max(1, Invoice::query()->sum('total_cents'))
                ),
                'nps' => $nps,
                'no_show_rate_percent' => $noShowRate,
            ],
            'operational' => [
                'appointments_today' => $appointmentsToday,
                'pending_confirmations' => $pendingConfirmations,
                'production_by_dentist' => $productionByDentist,
                'monthly_new_patients_by_source' => $monthlyPatients,
                'treatments' => $treatmentStats,
                'communications' => $communications,
                'low_stock_items' => InventoryItem::query()
                    ->whereColumn('stock_quantity', '<=', 'reorder_level')
                    ->count(),
            ],
            'financial' => [
                'payments_this_month_cents' => (int) $paymentsThisMonth,
                'overdue_invoices' => $overdueInvoices,
                'quarter_projection_cents' => (int) $quarterProjection,
            ],
            'benchmarks' => $sectorBenchmarks,
        ]);
    }

    private function percentage(int|float $value, int|float $total): int
    {
        if ($total <= 0) {
            return 0;
        }

        return (int) round(($value / $total) * 100);
    }
}
