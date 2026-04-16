import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/StatCard';
import { isAdminUser } from '@/shared/auth/session';
import { fetchDashboardSummary, fetchReportsSummary } from '@/shared/api/resources';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const defaultSummary = {
  appointments_today: 0,
  new_patients_today: 0,
  estimated_revenue_cents: 0,
  occupancy_percent: 0,
  alerts: ['Sin alertas importantes hoy.'],
};

export function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  });
  const { data: reports } = useQuery({
    queryKey: ['dashboard-reports-preview'],
    queryFn: fetchReportsSummary,
    staleTime: 60_000,
    enabled: isAdminUser(),
  });

  const summary = data ?? defaultSummary;

  const cards = useMemo(
    () => [
      {
        label: 'Citas hoy',
        value: String(summary.appointments_today),
        hint: 'Gestionadas desde la agenda activa',
      },
      {
        label: 'Pacientes nuevos',
        value: String(summary.new_patients_today),
        hint: 'Altas registradas hoy',
      },
      {
        label: 'Ingresos estimados',
        value: summary.estimated_revenue_cents
          ? currencyFormatter.format(summary.estimated_revenue_cents / 100)
          : 'Sin datos',
        hint: 'Suma de citas confirmadas',
      },
      {
        label: 'Ocupacion',
        value: `${summary.occupancy_percent ?? 0}%`,
        hint: 'Capacidad de agenda ocupada',
      },
    ],
    [summary],
  );

  return (
    <section className="space-y-6">
      <div className="panel page-hero rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="pill pill-strong">Resumen del dia</span>
            <h2 className="mt-4 text-4xl text-slate-950 md:text-[3.2rem]">Resumen de la clinica</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Mira las citas de hoy, los pacientes nuevos, los cobros y los avisos pendientes antes de empezar la jornada.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado agenda</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.appointments_today} citas hoy</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Produccion</p>
              
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {summary.estimated_revenue_cents ? currencyFormatter.format(summary.estimated_revenue_cents / 100) : 'Sin datos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando resumen del dashboard...</p>}

      {isError && <p className="text-sm text-red-600">{(error as Error | undefined)?.message || 'No fue posible cargar el resumen'}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </div>

      <div className="panel rounded-[1.75rem] p-6">
        <div className="flex items-center justify-between gap-4">
            <h3 className="text-2xl text-slate-950">Siguiente foco</h3>
          <span className="pill">Alertas vivas</span>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {(summary.alerts ?? ['Sin alertas activas']).map((alert) => (
            <li key={alert} className="rounded-[1.25rem] border border-slate-200/80 bg-white/70 px-4 py-3">
              {alert}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl text-slate-950">Accesos rapidos</h3>
            <p className="mt-2 text-sm text-slate-600">Abre las secciones que mas se usan en recepcion y gestion.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/documents"
              className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Ver documentos
            </Link>
            {isAdminUser() && (
              <>
                <Link
                  to="/finance"
                  className="rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Abrir finanzas
                </Link>
                <Link
                  to="/reports"
                  className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  Ver reportes
                </Link>
                <Link
                  to="/staff"
                  className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  Gestionar staff
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isAdminUser() && reports && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="panel rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl text-slate-950">Pulso de negocio</h3>
              <span className="pill">Vista rapida</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <StatCard
                label="Cobro"
                value={`${reports.executive.collection_rate_percent}%`}
                hint="Sobre total facturado"
              />
              <StatCard
                label="Ausencias"
                value={`${reports.executive.no_show_rate_percent}%`}
                hint="Comparado con actividad real"
              />
              <StatCard
                label="Pendientes hoy"
                value={String(reports.operational.pending_confirmations)}
                hint="Confirmaciones por cerrar"
              />
              <StatCard
                label="Stock critico"
                value={String(reports.operational.low_stock_items)}
                hint="Items para reponer"
              />
            </div>
          </div>

          <div className="panel rounded-[1.75rem] p-6">
            <h3 className="text-2xl text-slate-950">Siguientes modulos</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/communications" className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
                Comunicaciones
              </Link>
              <Link to="/operations" className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
                Operaciones
              </Link>
              <Link to="/ecosystem" className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
                Integraciones
              </Link>
              <Link to="/compliance" className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
                Privacidad
              </Link>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-500">
              Ingresos mensuales {currencyFormatter.format(reports.executive.mrr_cents / 100)} y cobros del mes{' '}
              {currencyFormatter.format(reports.financial.payments_this_month_cents / 100)}.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
