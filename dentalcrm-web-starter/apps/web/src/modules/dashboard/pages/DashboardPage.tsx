import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/StatCard';
import { isAdminUser } from '@/shared/auth/session';
import { fetchDashboardSummary, fetchReportsSummary } from '@/shared/api/resources';

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtFull = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

const defaultSummary = {
  appointments_today: 0,
  new_patients_today: 0,
  estimated_revenue_cents: 0,
  occupancy_percent: 0,
  alerts: ['Sin alertas importantes hoy.'],
};

type QuickLink = { label: string; to: string; accent?: boolean };

const adminLinks: QuickLink[] = [
  { label: 'Finanzas', to: '/finance', accent: true },
  { label: 'Presupuestos', to: '/quotes' },
  { label: 'Telemedicina', to: '/telemedicine' },
  { label: 'Comunicaciones', to: '/communications' },
  { label: 'Operaciones', to: '/operations' },
  { label: 'Reportes', to: '/reports' },
  { label: 'Integraciones', to: '/ecosystem' },
  { label: 'Staff', to: '/staff' },
];

const staffLinks: QuickLink[] = [
  { label: 'Agenda', to: '/appointments', accent: true },
  { label: 'Pacientes', to: '/patients' },
  { label: 'Documentos', to: '/documents' },
  { label: 'Comunicaciones', to: '/communications' },
];

export function DashboardPage() {
  const isAdmin = isAdminUser();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
  });

  const { data: reports } = useQuery({
    queryKey: ['dashboard-reports-preview'],
    queryFn: fetchReportsSummary,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const summary = data ?? defaultSummary;
  const links = isAdmin ? adminLinks : staffLinks;

  const kpis = useMemo(() => [
    {
      label: 'Citas hoy',
      value: String(summary.appointments_today),
      hint: 'En la agenda de hoy',
    },
    {
      label: 'Pacientes nuevos',
      value: String(summary.new_patients_today),
      hint: 'Altas registradas hoy',
    },
    {
      label: 'Ingresos estimados',
      value: summary.estimated_revenue_cents
        ? fmtFull.format(summary.estimated_revenue_cents / 100)
        : '—',
      hint: 'Citas completadas de hoy',
    },
    {
      label: 'Ocupacion',
      value: `${summary.occupancy_percent ?? 0}%`,
      hint: 'Capacidad de agenda usada',
    },
  ], [summary]);

  return (
    <section className="space-y-6">

      {/* Hero */}
      <div className="panel page-hero rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="pill pill-strong">Resumen del dia</span>
            <h2 className="mt-4 text-4xl text-slate-950 md:text-[3rem]">Resumen de la clinica</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Citas, cobros y avisos pendientes de un vistazo antes de empezar la jornada.
            </p>
          </div>

          {isAdmin && reports && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">MRR</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {fmt.format(reports.executive.mrr_cents / 100)}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ARR proyectado</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {fmt.format(reports.executive.arr_cents / 100)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando resumen...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          {(error as Error | undefined)?.message || 'No fue posible cargar el resumen'}
        </p>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </div>

      {/* Alerts + Quick actions */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="panel rounded-[1.75rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-slate-950">Alertas activas</h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {(summary.alerts ?? []).length}
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {(summary.alerts ?? ['Sin alertas activas.']).map((alert, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3">
                <span className="mt-0.5 text-amber-500">●</span>
                {alert}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel rounded-[1.75rem] p-6">
          <h3 className="text-xl font-semibold text-slate-950">Accesos rapidos</h3>
          <p className="mt-1 text-sm text-slate-500">Las secciones mas usadas en el dia a dia.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={
                  link.accent
                    ? 'rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700'
                    : 'rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Admin: business pulse */}
      {isAdmin && reports && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="panel rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-slate-950">Pulso del negocio</h3>
              <Link to="/reports" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                Ver reportes →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <StatCard
                label="Tasa de cobro"
                value={`${reports.executive.collection_rate_percent}%`}
                hint="Sobre total facturado"
              />
              <StatCard
                label="Tasa no-show"
                value={`${reports.executive.no_show_rate_percent}%`}
                hint="Ausencias sin aviso"
              />
              <StatCard
                label="LTV promedio"
                value={fmtFull.format(reports.executive.avg_ltv_cents / 100)}
                hint="Valor de vida del paciente"
              />
              <StatCard
                label="Confirmaciones pendientes"
                value={String(reports.operational.pending_confirmations)}
                hint="Citas sin confirmar"
              />
            </div>
          </div>

          <div className="panel rounded-[1.75rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-slate-950">Finanzas del mes</h3>
              <Link to="/finance" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                Ver finanzas →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <StatCard
                label="Cobros del mes"
                value={fmtFull.format(reports.financial.payments_this_month_cents / 100)}
                hint="Pagos recibidos"
              />
              <StatCard
                label="Facturas vencidas"
                value={String(reports.financial.overdue_invoices_count)}
                hint="Pendientes de cobro"
              />
              <StatCard
                label="Proyeccion trimestral"
                value={fmtFull.format(reports.financial.quarterly_projection_cents / 100)}
                hint="Estimacion basada en tendencia"
              />
              <StatCard
                label="Stock critico"
                value={String(reports.operational.low_stock_items)}
                hint="Items para reponer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Top dentists */}
      {isAdmin && reports && reports.operational.production_by_dentist.length > 0 && (
        <div className="panel rounded-[1.75rem] p-6">
          <h3 className="text-xl font-semibold text-slate-950">Produccion por dentista</h3>
          <p className="mt-1 text-sm text-slate-500">Basado en citas completadas y tratamientos registrados.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left font-semibold text-slate-500">Dentista</th>
                  <th className="pb-3 text-right font-semibold text-slate-500">Citas</th>
                  <th className="pb-3 text-right font-semibold text-slate-500">Ingresos</th>
                  <th className="pb-3 text-right font-semibold text-slate-500">Promedio/cita</th>
                </tr>
              </thead>
              <tbody>
                {reports.operational.production_by_dentist.map((d) => (
                  <tr key={d.dentist_id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-800">{d.dentist_name}</td>
                    <td className="py-3 text-right text-slate-600">{d.appointments_count}</td>
                    <td className="py-3 text-right text-slate-600">{fmtFull.format(d.revenue_cents / 100)}</td>
                    <td className="py-3 text-right text-slate-600">
                      {d.appointments_count > 0
                        ? fmtFull.format(d.revenue_cents / d.appointments_count / 100)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
