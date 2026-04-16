import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import { fetchReportsSummary } from '@/shared/api/resources';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function formatCurrency(valueCents: number) {
  return currencyFormatter.format(valueCents / 100);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('es-ES');
}

export function ReportsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: fetchReportsSummary,
    staleTime: 60_000,
  });

  const executiveCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        label: 'Ingresos mensuales',
        value: formatCurrency(data.executive.mrr_cents),
        hint: 'Referencia del mes actual',
      },
      {
        label: 'Proyeccion anual',
        value: formatCurrency(data.executive.arr_cents),
        hint: 'Estimacion para 12 meses',
      },
      {
        label: 'Valor por paciente',
        value: formatCurrency(data.executive.ltv_cents),
        hint: 'Ingreso medio esperado',
      },
      {
        label: 'Cobrado',
        value: formatPercent(data.executive.collection_rate_percent),
        hint: 'Sobre lo ya facturado',
      },
      {
        label: 'Agenda ocupada',
        value: formatPercent(data.executive.occupancy_percent),
        hint: 'Tiempo reservado del equipo',
      },
      {
        label: 'Ausencias',
        value: formatPercent(data.executive.no_show_rate_percent),
        hint: 'Citas no asistidas',
      },
      {
        label: 'Satisfaccion',
        value: String(data.executive.nps),
        hint: 'Valoracion general',
      },
      {
        label: 'Pacientes fieles',
        value: String(data.executive.patients_retained_last_180_days),
        hint: 'Pacientes activos en 180 dias',
      },
    ];
  }, [data]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand)]">Seguimiento</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Indicadores</h2>
        <p className="mt-2 text-sm text-slate-500">
          Resumen claro de actividad, ingresos y puntos de atencion de la clinica.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando reportes...</p>}
      {isError && (
        <p className="text-sm text-rose-600">
          {(error as Error | undefined)?.message || 'No se pudieron cargar los reportes'}
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {executiveCards.map((card) => (
              <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Actividad por profesional</h3>
                  <p className="mt-1 text-sm text-slate-500">Resumen de la semana actual.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {data.operational.production_by_dentist.length} profesionales
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {data.operational.production_by_dentist.length === 0 && (
                  <p className="text-sm text-slate-500">Todavia no hay produccion registrada.</p>
                )}

                {data.operational.production_by_dentist.map((dentist) => (
                  <div key={dentist.dentist_name} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{dentist.dentist_name || 'Sin asignar'}</p>
                        <p className="mt-1 text-sm text-slate-500">{dentist.appointments_count} citas esta semana</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-950">{formatCurrency(dentist.revenue_cents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Situacion del dia</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Citas hoy</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{data.operational.appointments_today}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Pendientes de confirmar</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{data.operational.pending_confirmations}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Mensajes enviados</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{data.operational.communications.sent}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {data.operational.communications.opened} leidos, {data.operational.communications.failed} con incidencia
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Stock critico</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{data.operational.low_stock_items}</p>
                  <p className="mt-2 text-xs text-slate-500">Articulos por debajo del minimo recomendado</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Pacientes y tratamientos</h3>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Pacientes nuevos por origen</p>
                  <div className="mt-3 space-y-3">
                    {data.operational.monthly_new_patients_by_source.length === 0 && (
                      <p className="text-sm text-slate-500">Sin altas nuevas este mes.</p>
                    )}
                    {data.operational.monthly_new_patients_by_source.map((source) => (
                      <div key={source.source} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-950">{source.source}</p>
                          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                            {source.total}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">Tratamientos top</p>
                  <div className="mt-3 space-y-3">
                    {data.operational.treatments.length === 0 && (
                      <p className="text-sm text-slate-500">Sin rendimiento de tratamientos todavia.</p>
                    )}
                    {data.operational.treatments.map((treatment) => (
                      <div key={treatment.treatment_name} className="rounded-2xl border border-slate-200 p-4">
                        <p className="font-semibold text-slate-950">{treatment.treatment_name}</p>
                        <p className="mt-1 text-sm text-slate-500">{treatment.appointments_count} citas</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {formatCurrency(treatment.revenue_cents)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Finanzas y comparativa</h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Cobrado este mes</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {formatCurrency(data.financial.payments_this_month_cents)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Proyeccion trimestral</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {formatCurrency(data.financial.quarter_projection_cents)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Ausencias media del sector</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {formatPercent(data.benchmarks.no_show_sector_avg_percent)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Retencion en clinicas lideres</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {formatPercent(data.benchmarks.retention_top_decile_percent)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-700">Facturas vencidas</p>
                <div className="mt-3 space-y-3">
                  {data.financial.overdue_invoices.length === 0 && (
                    <p className="text-sm text-slate-500">No hay facturas vencidas en este momento.</p>
                  )}
                  {data.financial.overdue_invoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{invoice.number}</p>
                          <p className="mt-1 text-sm text-slate-500">Vence: {formatDate(invoice.due_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-rose-700">{formatCurrency(invoice.total_cents)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Cobrado: {formatCurrency(invoice.paid_cents)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
