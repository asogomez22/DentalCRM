<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $clinicId = $request->attributes->get('clinic_id');

        $query = Quote::where('clinic_id', $clinicId)
            ->with(['patient', 'user', 'items'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('number', 'like', $search)
                  ->orWhere('title', 'like', $search)
                  ->orWhereHas('patient', fn ($p) => $p->where('first_name', 'like', $search)
                      ->orWhere('last_name', 'like', $search));
            });
        }

        return response()->json($query->get());
    }

    public function show(Request $request, Quote $quote): JsonResponse
    {
        $this->authorizeClinic($request, $quote->clinic_id);

        return response()->json($quote->load(['patient', 'user', 'items.treatment']));
    }

    public function store(Request $request): JsonResponse
    {
        $clinicId = $request->attributes->get('clinic_id');

        $data = $request->validate([
            'patient_id'   => 'required|integer',
            'user_id'      => 'nullable|integer',
            'appointment_id' => 'nullable|integer',
            'title'        => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
            'valid_until'  => 'nullable|date',
            'currency'     => 'nullable|string|size:3',
            'items'        => 'required|array|min:1',
            'items.*.description'     => 'required|string',
            'items.*.quantity'        => 'required|integer|min:1',
            'items.*.unit_price_cents'=> 'required|integer|min:0',
            'items.*.treatment_id'    => 'nullable|integer',
        ]);

        return DB::transaction(function () use ($data, $clinicId) {
            $quote = Quote::create([
                'clinic_id'    => $clinicId,
                'patient_id'   => $data['patient_id'],
                'user_id'      => $data['user_id'] ?? null,
                'appointment_id' => $data['appointment_id'] ?? null,
                'number'       => $this->nextQuoteNumber($clinicId),
                'title'        => $data['title'] ?? 'Presupuesto',
                'notes'        => $data['notes'] ?? null,
                'valid_until'  => $data['valid_until'] ?? null,
                'currency'     => $data['currency'] ?? 'EUR',
                'status'       => 'draft',
            ]);

            $this->syncItems($quote, $data['items']);
            $this->refreshTotals($quote);

            return response()->json($quote->load(['patient', 'user', 'items']), 201);
        });
    }

    public function update(Request $request, Quote $quote): JsonResponse
    {
        $this->authorizeClinic($request, $quote->clinic_id);

        $data = $request->validate([
            'title'        => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
            'valid_until'  => 'nullable|date',
            'currency'     => 'nullable|string|size:3',
            'items'        => 'nullable|array',
            'items.*.id'              => 'nullable|integer',
            'items.*.description'     => 'required_with:items|string',
            'items.*.quantity'        => 'required_with:items|integer|min:1',
            'items.*.unit_price_cents'=> 'required_with:items|integer|min:0',
            'items.*.treatment_id'    => 'nullable|integer',
            'items.*.accepted'        => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($quote, $data) {
            $quote->fill(array_filter([
                'title'       => $data['title'] ?? $quote->title,
                'notes'       => $data['notes'] ?? $quote->notes,
                'valid_until' => $data['valid_until'] ?? $quote->valid_until,
                'currency'    => $data['currency'] ?? $quote->currency,
            ]))->save();

            if (isset($data['items'])) {
                $this->syncItems($quote, $data['items']);
                $this->refreshTotals($quote);
            }

            return response()->json($quote->load(['patient', 'user', 'items']));
        });
    }

    public function send(Request $request, Quote $quote): JsonResponse
    {
        $this->authorizeClinic($request, $quote->clinic_id);

        $quote->update(['status' => 'sent', 'sent_at' => now()]);

        return response()->json($quote->load(['patient', 'user', 'items']));
    }

    public function accept(Request $request, Quote $quote): JsonResponse
    {
        $this->authorizeClinic($request, $quote->clinic_id);

        $acceptedIds = $request->input('accepted_item_ids', []);

        DB::transaction(function () use ($quote, $acceptedIds) {
            $quote->items()->update(['accepted' => false]);

            if (!empty($acceptedIds)) {
                $quote->items()->whereIn('id', $acceptedIds)->update(['accepted' => true]);
            }

            $quote->update(['status' => 'accepted', 'responded_at' => now()]);
            $this->refreshTotals($quote);
        });

        return response()->json($quote->load(['patient', 'user', 'items']));
    }

    public function reject(Request $request, Quote $quote): JsonResponse
    {
        $this->authorizeClinic($request, $quote->clinic_id);

        $quote->update(['status' => 'rejected', 'responded_at' => now()]);

        return response()->json($quote->load(['patient', 'user', 'items']));
    }

    public function destroy(Request $request, Quote $quote): JsonResponse
    {
        $this->authorizeClinic($request, $quote->clinic_id);
        $quote->delete();

        return response()->json(null, 204);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private function syncItems(Quote $quote, array $items): void
    {
        $keepIds = [];

        foreach ($items as $item) {
            $totalCents = ($item['unit_price_cents'] ?? 0) * ($item['quantity'] ?? 1);

            if (!empty($item['id'])) {
                $row = QuoteItem::find($item['id']);
                if ($row && $row->quote_id === $quote->id) {
                    $row->update(array_merge($item, ['total_cents' => $totalCents]));
                    $keepIds[] = $row->id;
                    continue;
                }
            }

            $row = $quote->items()->create(array_merge($item, ['total_cents' => $totalCents]));
            $keepIds[] = $row->id;
        }

        $quote->items()->whereNotIn('id', $keepIds)->delete();
    }

    private function refreshTotals(Quote $quote): void
    {
        $quote->refresh();
        $subtotal = $quote->items->sum('total_cents');
        $quote->update(['subtotal_cents' => $subtotal, 'total_cents' => $subtotal]);
    }

    private function nextQuoteNumber(int $clinicId): string
    {
        $year  = now()->year;
        $count = Quote::where('clinic_id', $clinicId)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('PRE-%d-%05d', $year, $count);
    }

    private function authorizeClinic(Request $request, int $resourceClinicId): void
    {
        abort_if($request->attributes->get('clinic_id') !== $resourceClinicId, 403);
    }
}
