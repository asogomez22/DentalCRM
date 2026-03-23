import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  acceptQuote,
  createQuote,
  deleteQuote,
  fetchPatients,
  fetchQuotes,
  fetchTreatments,
  rejectQuote,
  sendQuote,
} from '@/shared/api/resources';
import type { Quote, QuoteItemPayload } from '@/shared/types/quote';

type ItemRow = {
  id?: number;
  description: string;
  quantity: number;
  unit_price_cents: number;
  treatment_id: number | null;
};

const emptyItem = (): ItemRow => ({
  description: '',
  quantity: 1,
  unit_price_cents: 0,
  treatment_id: null,
});

type QuoteForm = {
  patient_id: string;
  title: string;
  notes: string;
  valid_until: string;
  items: ItemRow[];
};

const emptyForm = (): QuoteForm => ({
  patient_id: '',
  title: 'Presupuesto',
  notes: '',
  valid_until: '',
  items: [emptyItem()],
});

const STATUS_LABELS: Record<Quote['status'], string> = {
  draft:    'Borrador',
  sent:     'Enviado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  expired:  'Expirado',
};

const STATUS_COLORS: Record<Quote['status'], string> = {
  draft:    'bg-slate-100 text-slate-700',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired:  'bg-amber-100 text-amber-700',
};

function formatMoney(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(cents / 100);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-ES');
}

export function QuotesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuoteForm>(emptyForm());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<Quote | null>(null);
  const [acceptedItems, setAcceptedItems] = useState<Set<number>>(new Set());

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', statusFilter],
    queryFn: () => fetchQuotes(statusFilter ? { status: statusFilter } : undefined),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'quotes'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: fetchTreatments,
    staleTime: 300_000,
  });

  const createMutation = useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setForm(emptyForm());
    },
  });

  const sendMutation = useMutation({
    mutationFn: sendQuote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) => acceptQuote(id, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setSelected(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setSelected(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const stats = useMemo(() => {
    const total = quotes.length;
    const accepted = quotes.filter((q) => q.status === 'accepted').length;
    const pending = quotes.filter((q) => q.status === 'sent').length;
    const totalValue = quotes.reduce((sum, q) => sum + q.total_cents, 0);
    return { total, accepted, pending, totalValue };
  }, [quotes]);

  const itemsTotal = form.items.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);

  const handleItemChange = (index: number, field: keyof ItemRow, value: string | number | null) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleTreatmentChange = (index: number, treatmentId: string) => {
    const treatment = treatments.find((t) => String(t.id) === treatmentId);
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        treatment_id: treatment?.id ?? null,
        description: treatment?.name ?? items[index].description,
        unit_price_cents: treatment?.price_cents ?? items[index].unit_price_cents,
      };
      return { ...prev, items };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) return;

    const payload: QuoteItemPayload[] = form.items.map((i) => ({
      treatment_id: i.treatment_id,
      description: i.description,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
    }));

    createMutation.mutate({
      patient_id: Number(form.patient_id),
      title: form.title,
      notes: form.notes || null,
      valid_until: form.valid_until || null,
      items: payload,
    });
  };

  const openAccept = (quote: Quote) => {
    setSelected(quote);
    setAcceptedItems(new Set((quote.items ?? []).map((i) => i.id)));
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Finanzas</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Presupuestos</h2>
        <p className="mt-2 text-sm text-slate-500">
          Crea, envia y gestiona presupuestos interactivos. El paciente puede aceptar o rechazar tratamientos individualmente.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total presupuestos" value={String(stats.total)} hint="Todos los estados" />
        <StatCard label="Pendientes respuesta" value={String(stats.pending)} hint="Enviados sin respuesta" />
        <StatCard label="Aceptados" value={String(stats.accepted)} hint="Confirmados por paciente" />
        <StatCard label="Valor total" value={formatMoney(stats.totalValue)} hint="Suma de todos los presupuestos" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Create form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Nuevo presupuesto</h3>
          <p className="mt-1 text-sm text-slate-500">Cada linea puede aceptarse o rechazarse de forma independiente.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Paciente</span>
              <select
                value={form.patient_id}
                onChange={(e) => setForm((p) => ({ ...p, patient_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              >
                <option value="">Selecciona paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Titulo</span>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Presupuesto de ortodoncia"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Valido hasta</span>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
          </div>

          {/* Line items */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Lineas del presupuesto</span>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, items: [...p.items, emptyItem()] }))}
                className="text-sm font-semibold text-teal-600 hover:text-teal-700"
              >
                + Agregar linea
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                    <div className="space-y-1">
                      <select
                        value={item.treatment_id ?? ''}
                        onChange={(e) => handleTreatmentChange(idx, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Tratamiento libre</option>
                        {treatments.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <input
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="Descripcion del tratamiento"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs text-slate-500">Cant.</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs text-slate-500">Precio (€)</span>
                      <input
                        type="number"
                        min={0}
                        value={(item.unit_price_cents / 100).toFixed(2)}
                        onChange={(e) => handleItemChange(idx, 'unit_price_cents', Math.round(Number(e.target.value) * 100))}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-end">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                          className="rounded-lg px-2 py-2 text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-right text-xs text-slate-500">
                    Subtotal: {formatMoney(item.unit_price_cents * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between text-sm font-semibold text-slate-950">
              <span>Total estimado</span>
              <span>{formatMoney(itemsTotal)}</span>
            </div>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-slate-600">Notas internas</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Observaciones para el equipo..."
            />
          </label>

          <button
            type="submit"
            disabled={createMutation.isPending || !form.patient_id}
            className="mt-5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear presupuesto'}
          </button>

          {createMutation.isError && (
            <p className="mt-3 text-sm text-red-600">No se pudo crear el presupuesto.</p>
          )}
        </form>

        {/* List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950">Historial de presupuestos</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Cargando presupuestos...</p>}
            {!isLoading && quotes.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-500">No hay presupuestos que mostrar.</p>
              </div>
            )}

            {quotes.map((quote) => (
              <div key={quote.id} className="rounded-2xl border border-slate-200 p-4 hover:border-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-950">{quote.title}</p>
                      <span className="text-xs text-slate-400">{quote.number}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {quote.patient ? `${quote.patient.first_name} ${quote.patient.last_name}` : '-'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatMoney(quote.total_cents, quote.currency)}
                    </p>
                    {quote.valid_until && (
                      <p className="mt-1 text-xs text-slate-400">
                        Valido hasta: {formatDate(quote.valid_until)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[quote.status]}`}>
                      {STATUS_LABELS[quote.status]}
                    </span>

                    <div className="flex gap-1">
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => sendMutation.mutate(quote.id)}
                          disabled={sendMutation.isPending}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Enviar
                        </button>
                      )}
                      {quote.status === 'sent' && (
                        <>
                          <button
                            onClick={() => openAccept(quote)}
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(quote.id)}
                            disabled={rejectMutation.isPending}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => deleteMutation.mutate(quote.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items preview */}
                {quote.items && quote.items.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                    {quote.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          {item.accepted === true && <span className="text-emerald-500">✓</span>}
                          {item.accepted === false && <span className="text-rose-400">✕</span>}
                          {item.description} × {item.quantity}
                        </span>
                        <span>{formatMoney(item.total_cents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accept modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-950">Aceptar presupuesto</h3>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona los tratamientos que el paciente acepta. Los no marcados quedan rechazados.
            </p>

            <div className="mt-4 space-y-2">
              {(selected.items ?? []).map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={acceptedItems.has(item.id)}
                    onChange={(e) => {
                      setAcceptedItems((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 accent-teal-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                    <p className="text-xs text-slate-500">{formatMoney(item.total_cents)}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() =>
                  acceptMutation.mutate({ id: selected.id, ids: Array.from(acceptedItems) })
                }
                disabled={acceptMutation.isPending || acceptedItems.size === 0}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
              >
                {acceptMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
