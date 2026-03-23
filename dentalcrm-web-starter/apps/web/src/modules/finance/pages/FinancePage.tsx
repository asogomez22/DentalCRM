import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/StatCard';
import {
  createInvoice,
  createPayment,
  fetchInvoices,
  fetchPatients,
  fetchPayments,
  fetchTreatments,
} from '@/shared/api/resources';
import type { Invoice, InvoiceCreatePayload, PaymentCreatePayload } from '@/shared/types/invoice';

function exportInvoicesCsv(invoices: Invoice[]) {
  const headers = ['Numero', 'Paciente', 'Estado', 'Emision', 'Vencimiento', 'Total (EUR)', 'Cobrado (EUR)', 'Pendiente (EUR)'];
  const rows = invoices.map((inv) => [
    inv.number,
    `${inv.patient?.first_name ?? ''} ${inv.patient?.last_name ?? ''}`.trim(),
    invoiceStatusLabel(inv.status),
    inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('es-ES') : '',
    inv.due_at   ? new Date(inv.due_at).toLocaleDateString('es-ES') : '',
    (inv.total_cents / 100).toFixed(2),
    (inv.paid_cents / 100).toFixed(2),
    (Math.max(inv.total_cents - inv.paid_cents, 0) / 100).toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facturas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const paymentMethods = [
  { value: 'card', label: 'Tarjeta' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank_transfer', label: 'Transferencia' },
  { value: 'online', label: 'Online' },
  { value: 'financed', label: 'Financiado' },
] as const;

type InvoiceItemForm = {
  treatment_id: string;
  description: string;
  quantity: string;
  unit_price: string;
};

type InvoiceFormState = {
  patient_id: string;
  issued_at: string;
  due_at: string;
  notes: string;
  items: InvoiceItemForm[];
};

type PaymentFormState = {
  invoice_id: string;
  amount: string;
  method: PaymentCreatePayload['method'];
  paid_at: string;
  reference: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyInvoiceItem = (): InvoiceItemForm => ({
  treatment_id: '',
  description: '',
  quantity: '1',
  unit_price: '0',
});

const emptyInvoiceForm = (): InvoiceFormState => ({
  patient_id: '',
  issued_at: today,
  due_at: '',
  notes: '',
  items: [emptyInvoiceItem()],
});

const emptyPaymentForm = (): PaymentFormState => ({
  invoice_id: '',
  amount: '',
  method: 'card',
  paid_at: today,
  reference: '',
  notes: '',
});

function formatCurrency(valueCents: number) {
  return currencyFormatter.format(valueCents / 100);
}

function parseMoney(value: string) {
  const normalized = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }

  return Math.round(normalized * 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('es-ES');
}

function getInvoiceStatusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'partially_paid':
      return 'bg-amber-100 text-amber-700';
    case 'cancelled':
      return 'bg-slate-200 text-slate-600';
    default:
      return 'bg-rose-100 text-rose-700';
  }
}

function invoiceStatusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'Pagada';
    case 'partially_paid':
      return 'Pago parcial';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'bank_transfer':
      return 'Transferencia';
    case 'online':
      return 'Pago online';
    case 'financed':
      return 'Financiado';
    default:
      return 'Tarjeta';
  }
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case 'failed':
      return 'Con incidencia';
    case 'pending':
      return 'Pendiente';
    default:
      return 'Completado';
  }
}

function getOutstanding(invoice: Invoice) {
  return Math.max(invoice.total_cents - invoice.paid_cents, 0);
}

export function FinancePage() {
  const queryClient = useQueryClient();
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'finance'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments', 'finance'],
    queryFn: () => fetchTreatments(true),
    staleTime: 60_000,
  });

  const {
    data: invoices = [],
    isLoading: invoicesLoading,
    isError: invoicesError,
    error: invoicesQueryError,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchInvoices(),
  });

  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
    error: paymentsQueryError,
  } = useQuery({
    queryKey: ['payments'],
    queryFn: () => fetchPayments(),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setInvoiceForm(emptyInvoiceForm());
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPaymentForm(emptyPaymentForm());
    },
  });

  const openInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled'),
    [invoices],
  );

  useEffect(() => {
    if (paymentForm.invoice_id) {
      return;
    }

    const firstOpenInvoice = openInvoices[0];
    if (!firstOpenInvoice) {
      return;
    }

    setPaymentForm((previous) => ({
      ...previous,
      invoice_id: String(firstOpenInvoice.id),
      amount: (getOutstanding(firstOpenInvoice) / 100).toFixed(2),
    }));
  }, [openInvoices, paymentForm.invoice_id]);

  useEffect(() => {
    const selectedInvoice = invoices.find((invoice) => invoice.id === Number(paymentForm.invoice_id));
    if (!selectedInvoice) {
      return;
    }

    const outstanding = getOutstanding(selectedInvoice);
    setPaymentForm((previous) => ({
      ...previous,
      amount: previous.amount ? previous.amount : (outstanding / 100).toFixed(2),
    }));
  }, [invoices, paymentForm.invoice_id]);

  const stats = useMemo(() => {
    const billed = invoices.reduce((total, invoice) => total + invoice.total_cents, 0);
    const collected = payments
      .filter((payment) => payment.status === 'completed')
      .reduce((total, payment) => total + payment.amount_cents, 0);
    const outstanding = invoices.reduce((total, invoice) => total + getOutstanding(invoice), 0);

    return {
      billed,
      collected,
      outstanding,
      openCount: openInvoices.length,
    };
  }, [invoices, openInvoices, payments]);

  const invoiceCanSubmit =
    Number(invoiceForm.patient_id) > 0 &&
    invoiceForm.items.length > 0 &&
    invoiceForm.items.every((item) => item.description.trim().length > 0 && Number.parseFloat(item.quantity) > 0);

  const paymentCanSubmit = Number(paymentForm.invoice_id) > 0 && parseMoney(paymentForm.amount) > 0;

  const submitInvoice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invoiceCanSubmit) {
      return;
    }

    const payload: InvoiceCreatePayload = {
      patient_id: Number(invoiceForm.patient_id),
      issued_at: invoiceForm.issued_at,
      due_at: invoiceForm.due_at || null,
      notes: invoiceForm.notes.trim() || null,
      items: invoiceForm.items.map((item) => ({
        treatment_id: item.treatment_id ? Number(item.treatment_id) : null,
        description: item.description.trim(),
        quantity: Number.parseFloat(item.quantity),
        unit_price_cents: parseMoney(item.unit_price),
      })),
    };

    createInvoiceMutation.mutate(payload);
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentCanSubmit) {
      return;
    }

    const payload: PaymentCreatePayload = {
      invoice_id: Number(paymentForm.invoice_id),
      amount_cents: parseMoney(paymentForm.amount),
      method: paymentForm.method,
      paid_at: paymentForm.paid_at,
      reference: paymentForm.reference.trim() || null,
      notes: paymentForm.notes.trim() || null,
      status: 'completed',
    };

    createPaymentMutation.mutate(payload);
  };

  const updateInvoiceItem = (index: number, patch: Partial<InvoiceItemForm>) => {
    setInvoiceForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const handleTreatmentChange = (index: number, treatmentId: string) => {
    const treatment = treatments.find((entry) => entry.id === Number(treatmentId));
    updateInvoiceItem(index, {
      treatment_id: treatmentId,
      description: treatment?.name ?? '',
      unit_price: treatment ? (treatment.price_cents / 100).toFixed(2) : '0',
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">Facturacion</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Finanzas</h2>
          <p className="mt-2 text-sm text-slate-500">
            Emite facturas, registra cobros y revisa lo pendiente de cada paciente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:items-start">
          <Link
            to="/quotes"
            className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100"
          >
            Presupuestos
          </Link>
          <button
            type="button"
            onClick={() => exportInvoicesCsv(invoices)}
            disabled={invoices.length === 0}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturado" value={formatCurrency(stats.billed)} hint="Total de facturas emitidas" />
        <StatCard label="Cobrado" value={formatCurrency(stats.collected)} hint="Pagos completados" />
        <StatCard label="Pendiente" value={formatCurrency(stats.outstanding)} hint="Saldo por cobrar" />
        <StatCard label="Facturas abiertas" value={String(stats.openCount)} hint="Pendientes o parciales" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <form onSubmit={submitInvoice} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Nueva factura</h3>
              <p className="mt-1 text-sm text-slate-500">Anade los conceptos y deja la factura lista para enviar o cobrar.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setInvoiceForm((previous) => ({
                  ...previous,
                  items: [...previous.items, emptyInvoiceItem()],
                }))
              }
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Anadir linea
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Paciente</span>
              <select
                value={invoiceForm.patient_id}
                onChange={(event) => setInvoiceForm((previous) => ({ ...previous, patient_id: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Selecciona paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Fecha de emision</span>
              <input
                type="date"
                value={invoiceForm.issued_at}
                onChange={(event) => setInvoiceForm((previous) => ({ ...previous, issued_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Vencimiento</span>
              <input
                type="date"
                value={invoiceForm.due_at}
                onChange={(event) => setInvoiceForm((previous) => ({ ...previous, due_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Notas</span>
              <input
                value={invoiceForm.notes}
                onChange={(event) => setInvoiceForm((previous) => ({ ...previous, notes: event.target.value }))}
                placeholder="Observaciones internas"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-5 space-y-4">
            {invoiceForm.items.map((item, index) => (
              <div key={`${index}-${item.treatment_id}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.1fr_1.4fr_0.6fr_0.7fr_auto]">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Tratamiento</span>
                  <select
                    value={item.treatment_id}
                    onChange={(event) => handleTreatmentChange(index, event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">Manual</option>
                    {treatments.map((treatment) => (
                      <option key={treatment.id} value={treatment.id}>
                        {treatment.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Descripcion</span>
                  <input
                    value={item.description}
                    onChange={(event) => updateInvoiceItem(index, { description: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Cantidad</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={item.quantity}
                    onChange={(event) => updateInvoiceItem(index, { quantity: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Precio EUR</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(event) => updateInvoiceItem(index, { unit_price: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceForm((previous) => ({
                        ...previous,
                        items: previous.items.length === 1
                          ? previous.items
                          : previous.items.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Total estimado:{' '}
              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  invoiceForm.items.reduce(
                    (total, item) => total + Math.round(Number.parseFloat(item.quantity || '0') * parseMoney(item.unit_price)),
                    0,
                  ),
                )}
              </span>
            </p>

            <button
              type="submit"
              disabled={!invoiceCanSubmit || createInvoiceMutation.isPending}
              className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              {createInvoiceMutation.isPending ? 'Guardando...' : 'Emitir factura'}
            </button>
          </div>

          {createInvoiceMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              {(createInvoiceMutation.error as Error | undefined)?.message || 'No se pudo emitir la factura'}
            </p>
          )}
        </form>

        <form onSubmit={submitPayment} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Registrar cobro</h3>
          <p className="mt-1 text-sm text-slate-500">Vincula el pago a una factura pendiente y actualiza el saldo.</p>

          <div className="mt-5 space-y-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Factura</span>
              <select
                value={paymentForm.invoice_id}
                onChange={(event) => {
                  const invoice = invoices.find((entry) => entry.id === Number(event.target.value));
                  setPaymentForm((previous) => ({
                    ...previous,
                    invoice_id: event.target.value,
                    amount: invoice ? (getOutstanding(invoice) / 100).toFixed(2) : previous.amount,
                  }));
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Selecciona factura</option>
                {openInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} - {invoice.patient?.first_name} {invoice.patient?.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Importe EUR</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, amount: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Metodo</span>
              <select
                value={paymentForm.method}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    method: event.target.value as PaymentCreatePayload['method'],
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Fecha de pago</span>
              <input
                type="date"
                value={paymentForm.paid_at}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, paid_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Referencia</span>
              <input
                value={paymentForm.reference}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, reference: event.target.value }))}
                placeholder="Operacion, TPV, transferencia..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Notas</span>
              <textarea
                value={paymentForm.notes}
                onChange={(event) => setPaymentForm((previous) => ({ ...previous, notes: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={!paymentCanSubmit || createPaymentMutation.isPending}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {createPaymentMutation.isPending ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>

          {createPaymentMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              {(createPaymentMutation.error as Error | undefined)?.message || 'No se pudo registrar el pago'}
            </p>
          )}
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Facturas recientes</h3>
          </div>

          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Factura</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Importe</th>
                <th className="px-4 py-3 font-medium">Pendiente</th>
                <th className="px-4 py-3 font-medium">Emision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesLoading && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    Cargando facturas...
                  </td>
                </tr>
              )}

              {invoicesError && (
                <tr>
                  <td className="px-4 py-4 text-red-600" colSpan={6}>
                    {(invoicesQueryError as Error | undefined)?.message || 'No se pudieron cargar las facturas'}
                  </td>
                </tr>
              )}

              {!invoicesLoading && !invoicesError && invoices.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    Aun no hay facturas emitidas.
                  </td>
                </tr>
              )}

              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-medium text-slate-900">{invoice.number}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {invoice.patient?.first_name} {invoice.patient?.last_name}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceStatusClass(invoice.status)}`}>
                      {invoiceStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatCurrency(invoice.total_cents)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatCurrency(getOutstanding(invoice))}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(invoice.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Ultimos pagos</h3>
          </div>

          <div className="space-y-3 p-5">
            {paymentsLoading && <p className="text-sm text-slate-500">Cargando pagos...</p>}
            {paymentsError && (
              <p className="text-sm text-red-600">
                {(paymentsQueryError as Error | undefined)?.message || 'No se pudieron cargar los pagos'}
              </p>
            )}
            {!paymentsLoading && !paymentsError && payments.length === 0 && (
              <p className="text-sm text-slate-500">Todavia no hay pagos registrados.</p>
            )}

            {payments.slice(0, 8).map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{formatCurrency(payment.amount_cents)}</p>
                    <p className="text-sm text-slate-500">
                      {payment.invoice?.number || `Factura ${payment.invoice_id}`} - {paymentMethodLabel(payment.method)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {payment.patient?.first_name} {payment.patient?.last_name}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {paymentStatusLabel(payment.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDate(payment.paid_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
