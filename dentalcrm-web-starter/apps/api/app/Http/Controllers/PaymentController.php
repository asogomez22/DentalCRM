<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $payments = Payment::query()
            ->with(['patient:id,first_name,last_name', 'invoice:id,number,total_cents,paid_cents,status'])
            ->when($request->filled('invoice_id'), fn ($query) => $query->where('invoice_id', $request->integer('invoice_id')))
            ->when($request->filled('patient_id'), fn ($query) => $query->where('patient_id', $request->integer('patient_id')))
            ->orderByDesc('paid_at')
            ->get();

        return response()->json($payments);
    }

    public function store(Request $request, InvoiceController $invoiceController)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'invoice_id' => ['required', 'integer', Rule::exists('invoices', 'id')->where('clinic_id', $clinicId)],
            'amount_cents' => ['required', 'integer', 'min:1'],
            'method' => ['required', 'string', Rule::in(['cash', 'card', 'bank_transfer', 'financed', 'online'])],
            'status' => ['nullable', 'string', Rule::in(['pending', 'completed', 'failed'])],
            'paid_at' => ['nullable', 'date'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = Invoice::query()->findOrFail($data['invoice_id']);

        $payment = Payment::create([
            'clinic_id' => $clinicId,
            'invoice_id' => $invoice->id,
            'patient_id' => $invoice->patient_id,
            'amount_cents' => $data['amount_cents'],
            'method' => $data['method'],
            'status' => $data['status'] ?? 'completed',
            'paid_at' => $data['paid_at'] ?? now(),
            'reference' => $data['reference'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $invoiceController->refreshTotals($invoice->fresh());

        return response()->json($payment->load(['patient', 'invoice']), 201);
    }
}
