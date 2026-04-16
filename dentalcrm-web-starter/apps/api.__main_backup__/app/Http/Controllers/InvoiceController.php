<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $invoices = Invoice::query()
            ->with(['patient:id,first_name,last_name', 'items', 'payments'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('patient_id'), fn ($query) => $query->where('patient_id', $request->integer('patient_id')))
            ->orderByDesc('issued_at')
            ->get();

        return response()->json($invoices);
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['patient', 'appointment', 'items.treatment', 'payments']));
    }

    public function store(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'appointment_id' => ['nullable', 'integer', Rule::exists('appointments', 'id')->where('clinic_id', $clinicId)],
            'issued_at' => ['required', 'date'],
            'due_at' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:180'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price_cents' => ['required', 'integer', 'min:0'],
            'items.*.treatment_id' => ['nullable', 'integer', Rule::exists('treatments', 'id')->where('clinic_id', $clinicId)],
        ]);

        $invoice = DB::transaction(function () use ($clinicId, $data) {
            $invoice = Invoice::create([
                'clinic_id' => $clinicId,
                'patient_id' => $data['patient_id'],
                'appointment_id' => $data['appointment_id'] ?? null,
                'number' => $this->nextInvoiceNumber($clinicId),
                'status' => 'pending',
                'issued_at' => $data['issued_at'],
                'due_at' => $data['due_at'] ?? null,
                'currency' => strtoupper($data['currency'] ?? 'EUR'),
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncItems($invoice, $data['items']);
            $this->refreshTotals($invoice);

            return $invoice;
        });

        return response()->json($invoice->load(['patient', 'items', 'payments']), 201);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'status' => ['sometimes', 'required', 'string', Rule::in(['pending', 'partially_paid', 'paid', 'cancelled'])],
            'issued_at' => ['sometimes', 'required', 'date'],
            'due_at' => ['nullable', 'date'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.description' => ['required_with:items', 'string', 'max:180'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'gt:0'],
            'items.*.unit_price_cents' => ['required_with:items', 'integer', 'min:0'],
            'items.*.treatment_id' => ['nullable', 'integer', Rule::exists('treatments', 'id')->where('clinic_id', $clinicId)],
        ]);

        $invoice = DB::transaction(function () use ($invoice, $data) {
            $invoice->update([
                'status' => $data['status'] ?? $invoice->status,
                'issued_at' => $data['issued_at'] ?? $invoice->issued_at,
                'due_at' => array_key_exists('due_at', $data) ? $data['due_at'] : $invoice->due_at,
                'currency' => strtoupper($data['currency'] ?? $invoice->currency),
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $invoice->notes,
            ]);

            if (array_key_exists('items', $data)) {
                $invoice->items()->delete();
                $this->syncItems($invoice, $data['items']);
            }

            $this->refreshTotals($invoice);

            return $invoice;
        });

        return response()->json($invoice->load(['patient', 'items', 'payments']));
    }

    private function nextInvoiceNumber(int $clinicId): string
    {
        $count = Invoice::withoutGlobalScopes()
            ->where('clinic_id', $clinicId)
            ->count() + 1;

        return sprintf('INV-%s-%05d', now()->format('Y'), $count);
    }

    private function syncItems(Invoice $invoice, array $items): void
    {
        foreach ($items as $item) {
            $quantity = (float) $item['quantity'];
            $unitPrice = (int) $item['unit_price_cents'];
            $total = (int) round($quantity * $unitPrice);

            $invoice->items()->create([
                'treatment_id' => $item['treatment_id'] ?? null,
                'description' => $item['description'],
                'quantity' => $quantity,
                'unit_price_cents' => $unitPrice,
                'total_cents' => $total,
            ]);
        }
    }

    public function refreshTotals(Invoice $invoice): void
    {
        $subtotal = (int) $invoice->items()->sum('total_cents');
        $paid = (int) $invoice->payments()->where('status', 'completed')->sum('amount_cents');

        $invoice->update([
            'subtotal_cents' => $subtotal,
            'tax_cents' => 0,
            'total_cents' => $subtotal,
            'paid_cents' => $paid,
            'status' => $paid <= 0
                ? ($invoice->status === 'cancelled' ? 'cancelled' : 'pending')
                : ($paid >= $subtotal ? 'paid' : 'partially_paid'),
        ]);
    }
}
