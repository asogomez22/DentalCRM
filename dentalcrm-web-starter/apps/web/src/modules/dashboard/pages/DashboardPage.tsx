import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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

type QuickLink = {
  label: string;
  to: string;
  icon: string;
  desc: string;
  accent?: boolean;
};

const adminLinks: QuickLink[] = [
  { label: 'Agenda', to: '/appointments', icon: '🗓', desc: 'Citas del día', accent: true },
  { label: 'Pacientes', to: '/patients', icon: '👥', desc: 'Historial clínico' },
  { label: 'Finanzas', to: '/finance', icon: '💰', desc: 'Cobros y facturas' },
  { label: 'Reportes', to: '/reports', icon: '📊', desc: 'Métricas y análisis' },
  { label: 'Presupuestos', to: '/quotes', icon: '📝', desc: 'Planes de tratamiento' },
  { label: 'Telemedicina', to: '/telemedicine', icon: '🎥', desc: 'Consultas online' },
  { label: 'Comunicaciones', to: '/communications', icon: '💬', desc: 'Mensajes y avisos' },
  { label: 'Integraciones', to: '/ecosystem', icon: '🔗', desc: 'Apps conectadas' },
];

const staffLinks: QuickLink[] = [
  { label: 'Agenda', to: '/appointments', icon: '🗓', desc: 'Ver mis citas', accent: true },
  { label: 'Pacientes', to: '/patients', icon: '👥', desc: 'Historial clínico' },
  { label: 'Documentos', to: '/documents', icon: '📄', desc: 'Archivos clínicos' },
  { label: 'Comunicaciones', to: '/communications', icon: '💬', desc: 'Mensajes y avisos' },
];

/* ─── helpers ─── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/* ─── sub-components ─── */
type KpiCardProps = {
  icon: string;
  label: string;
  value: string;
  hint: string;
  bg: string;
};

function KpiCard({ icon, label, value, hint, bg }: KpiCardProps) {
  return (
    <div className={`panel card-lift relative overflow-hidden rounded-[1.75rem] p-5 ${bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="font-display mt-3 text-[2.6rem] leading-none text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-sm">
          {icon}
        </span>
      </div>
    </div>
  );
}

type MiniStatProps = { label: string; value: string | number };
function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="flex flex-col items-end">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{label}</p>
      <p className="font-display mt-1 text-2xl text-white">{value}</p>
    </div>
  );
}

/* ─── main page ─── */
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

  const greeting = useMemo(getGreeting, []);
  const todayLabel = useMemo(getTodayLabel, []);

  const alerts = summary.alerts ?? ['Sin alertas activas.'];
  const hasRealAlerts = alerts.length > 0 && !alerts[0].toLowerCase().includes('sin alertas');

  const kpis: KpiCardProps[] = useMemo(() => [
    {
      icon: '🗓',
      label: 'Citas hoy',
      value: String(summary.appointments_today),
      hint: 'En la agenda de hoy',
      bg: 'bg-teal-50/60',
    },
    {
      icon: '🧑‍⚕️',
      label: 'Pacientes nuevos',
      value: String(summary.new_patients_today),
      hint: 'Altas registradas hoy',
      bg: 'bg-emerald-50/60',
    },
    {
      icon: '💶',
      label: 'Ingresos estimados',
      value: summary.estimated_revenue_cents ? fmtFull.format(summary.estimated_revenue_cents / 100) : '—',
      hint: 'Citas completadas de hoy',
      bg: 'bg-amber-50/60',
    },
    {
      icon: '📈',
      label: 'Ocupación',
      value: `${summary.occupancy_percent ?? 0}%`,
      hint: 'Capacidad usada',
      bg: 'bg-sky-50/60',
    },
  ], [summary]);

  return (
    <section className="space-y-5">

      {/* ── Hero greeting ── */}
      <div className="panel-dark rounded-[2rem] px-7 py-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              {greeting} · <span className="capitalize">{todayLabel}</span>
            </p>
            <h2 className="font-display mt-2 text-3xl text-white md:text-4xl">
              Resumen de la clínica
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Todo lo importante para empezar la jornada de un vistazo.
            </p>
          </div>

          <div className="flex items-center gap-6 border-t border-white/10 pt-4 md:border-0 md:pt-0">
            <MiniStat label="Citas hoy" value={summary.appointments_today} />
            <div className="h-8 w-px bg-white/10" />
            <MiniStat label="Ocupación" value={`${summary.occupancy_percent ?? 0}%`} />
            {isAdmin && reports && (
              <>
                <div className="h-8 w-px bg-white/10" />
                <MiniStat label="MRR" value={fmt.format(reports.executive.mrr_cents / 100)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading / error ── */}
      {isLoading && (
        <div className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white/70 px-5 py-4 text-sm text-slate-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
          Cargando resumen...
        </div>
      )}
      {isError && (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {(error as Error | undefined)?.message || 'No fue posible cargar el resumen'}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Accesos + Alertas ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">

        {/* Accesos rápidos */}
        <div className="panel rounded-[1.75rem] p-6">
          <h3 className="text-xl font-semibold text-slate-950">Accesos rápidos</h3>
          <p className="mt-1 text-sm text-slate-500">Las secciones más usadas en el día a día.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`group flex flex-col gap-3 rounded-2xl border p-4 transition hover:shadow-md ${
                  link.accent
                    ? 'border-teal-200 bg-teal-50/70 hover:border-teal-300 hover:bg-teal-50'
                    : 'border-slate-200/80 bg-white/60 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                  link.accent ? 'bg-teal-100' : 'bg-slate-100'
                }`}>
                  {link.icon}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${link.accent ? 'text-teal-800' : 'text-slate-800'}`}>
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{link.desc}</p>
                </div>
                <span className={`ml-auto text-xs font-medium ${link.accent ? 'text-teal-500' : 'text-slate-300'} group-hover:translate-x-0.5 transition-transform`}>
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div className="panel rounded-[1.75rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-950">Alertas</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              hasRealAlerts ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {hasRealAlerts ? alerts.length : '0'}
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {alerts.map((alert, i) => {
              const isNeutral = alert.toLowerCase().includes('sin alertas');
              return (
                <li
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isNeutral
                      ? 'border-slate-200/80 bg-white/50 text-slate-500'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 text-base ${isNeutral ? 'text-slate-300' : 'text-amber-400'}`}>
                    {isNeutral ? '○' : '⚠'}
                  </span>
                  {alert}
                </li>
              );
            })}
          </ul>

          {!hasRealAlerts && (
            <p className="mt-4 text-center text-xs text-slate-300">Todo en orden ✓</p>
          )}
        </div>
      </div>

      {/* ── Admin: métricas de negocio ── */}
      {isAdmin && reports && (
        <>
          <div className="grid gap-5 xl:grid-cols-2">

            {/* Pulso del negocio */}
            <div className="panel rounded-[1.75rem] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">Pulso del negocio</h3>
                  <p className="mt-0.5 text-sm text-slate-500">Indicadores clave de rendimiento.</p>
                </div>
                <Link to="/reports" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                  Ver reportes →
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { label: 'Tasa de cobro', value: `${reports.executive.collection_rate_percent}%`, icon: '💳', color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Tasa no-show', value: `${reports.executive.no_show_rate_percent}%`, icon: '🚫', color: 'text-rose-700 bg-rose-50' },
                  { label: 'LTV promedio', value: fmtFull.format(reports.executive.ltv_cents / 100), icon: '⭐', color: 'text-violet-700 bg-violet-50' },
                  { label: 'Sin confirmar', value: String(reports.operational.pending_confirmations), icon: '⏳', color: 'text-amber-700 bg-amber-50' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/60 p-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${color}`}>
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                      <p className="font-display mt-0.5 text-2xl text-slate-950">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Finanzas del mes */}
            <div className="panel rounded-[1.75rem] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">Finanzas del mes</h3>
                  <p className="mt-0.5 text-sm text-slate-500">Cobros, vencidos y proyecciones.</p>
                </div>
                <Link to="/finance" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                  Ver finanzas →
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { label: 'Cobros del mes', value: fmtFull.format(reports.financial.payments_this_month_cents / 100), icon: '✅', color: 'text-teal-700 bg-teal-50' },
                  { label: 'Facturas vencidas', value: String(reports.financial.overdue_invoices.length), icon: '⚠', color: 'text-rose-700 bg-rose-50' },
                  { label: 'Proyección trimestral', value: fmt.format(reports.financial.quarter_projection_cents / 100), icon: '📈', color: 'text-sky-700 bg-sky-50' },
                  { label: 'Stock crítico', value: String(reports.operational.low_stock_items), icon: '📦', color: 'text-amber-700 bg-amber-50' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/60 p-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${color}`}>
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                      <p className="font-display mt-0.5 text-2xl leading-tight text-slate-950">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ARR / MRR highlight */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="panel-dark flex items-center gap-5 rounded-[1.75rem] px-6 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-2xl">
                💵
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">MRR</p>
                <p className="font-display mt-1 text-3xl text-white">{fmt.format(reports.executive.mrr_cents / 100)}</p>
                <p className="mt-0.5 text-xs text-white/40">Ingresos mensuales recurrentes</p>
              </div>
            </div>
            <div className="panel-dark flex items-center gap-5 rounded-[1.75rem] px-6 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl">
                🎯
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">ARR proyectado</p>
                <p className="font-display mt-1 text-3xl text-white">{fmt.format(reports.executive.arr_cents / 100)}</p>
                <p className="mt-0.5 text-xs text-white/40">Anualizado sobre MRR actual</p>
              </div>
            </div>
          </div>

          {/* Producción por dentista */}
          {reports.operational.production_by_dentist.length > 0 && (
            <div className="panel rounded-[1.75rem] p-6">
              <h3 className="text-xl font-semibold text-slate-950">Producción por dentista</h3>
              <p className="mt-1 text-sm text-slate-500">Basado en citas completadas y tratamientos registrados.</p>

              <div className="mt-5 space-y-3">
                {reports.operational.production_by_dentist.map((d, index) => {
                  const maxRevenue = Math.max(...reports.operational.production_by_dentist.map((x) => x.revenue_cents), 1);
                  const pct = Math.round((d.revenue_cents / maxRevenue) * 100);
                  const badgeColors = [
                    'bg-amber-100 text-amber-700',
                    'bg-slate-200 text-slate-600',
                    'bg-orange-100 text-orange-700',
                  ];
                  const initials = d.dentist_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('');
                  return (
                    <div key={d.dentist_name} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/60 px-4 py-3">
                      {/* Rank */}
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeColors[index] ?? 'bg-slate-100 text-slate-500'}`}>
                        {index + 1}
                      </span>
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        {initials}
                      </div>
                      {/* Name + bar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">{d.dentist_name}</p>
                          <p className="shrink-0 text-sm font-bold text-slate-950">{fmtFull.format(d.revenue_cents / 100)}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="shrink-0 text-xs text-slate-400">{d.appointments_count} citas</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
