import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { clearAuthSession, getAuthUser, getUserRole, isAdminUser } from '@/shared/auth/session';
import { fetchClinicSettings, logout } from '@/shared/api/resources';

type NavLink = { to: string; label: string; adminOnly?: boolean };
type NavGroup = { group: string; items: NavLink[] };

const navGroups: NavGroup[] = [
  {
    group: 'General',
    items: [
      { to: '/dashboard', label: 'Resumen' },
      { to: '/patients', label: 'Pacientes' },
      { to: '/appointments', label: 'Agenda' },
      { to: '/documents', label: 'Documentos' },
    ],
  },
  {
    group: 'Clinica',
    items: [
      { to: '/finance', label: 'Finanzas', adminOnly: true },
      { to: '/quotes', label: 'Presupuestos', adminOnly: true },
      { to: '/telemedicine', label: 'Telemedicina', adminOnly: true },
      { to: '/communications', label: 'Comunicaciones', adminOnly: true },
    ],
  },
  {
    group: 'Gestion',
    items: [
      { to: '/operations', label: 'Operaciones', adminOnly: true },
      { to: '/reports', label: 'Indicadores', adminOnly: true },
      { to: '/staff', label: 'Equipo', adminOnly: true },
      { to: '/settings', label: 'Clinica', adminOnly: true },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { to: '/ecosystem', label: 'Integraciones', adminOnly: true },
      { to: '/compliance', label: 'Privacidad', adminOnly: true },
    ],
  },
];

// Flat list for mobile nav
const links = navGroups.flatMap((g) => g.items);

export function AppLayout() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const role = getUserRole();

  const { data: settings } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: fetchClinicSettings,
    staleTime: 60_000,
  });

  const brandName = settings?.brand_name || 'Clinica Demo';
  const mainColor = settings?.primary_color || '#0f766e';
  const supportLine = settings?.public_phone || settings?.public_email || 'Clinica conectada';

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuthSession();
      navigate('/login', { replace: true });
    },
  });

  const styleVars = useMemo(() => ({ '--color-brand': mainColor }) as Record<string, string>, [mainColor]);

  useEffect(() => {
    const handler = () => {
      clearAuthSession();
      navigate('/login', { replace: true });
    };

    window.addEventListener('dentalcrm:auth-expired', handler);
    return () => window.removeEventListener('dentalcrm:auth-expired', handler);
  }, [navigate]);

  const visibleLinks = useMemo(() => {
    return links.filter((link) => !link.adminOnly || isAdminUser());
  }, []);

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((l) => !l.adminOnly || isAdminUser()) }))
      .filter((g) => g.items.length > 0);
  }, []);

  return (
    <div className="min-h-screen text-slate-900">
      <div className="flex min-h-screen w-full flex-col gap-4 px-3 py-3 md:px-4 md:py-4 xl:grid xl:grid-cols-[320px_minmax(0,1fr)]" style={styleVars}>
        <aside className="hidden xl:block">
          <div className="panel-dark sticky top-4 flex min-h-[calc(100vh-2rem)] flex-col rounded-[2rem] p-6">
            <div className="page-hero rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">DentalCRM</p>
              <h1 className="mt-3 text-3xl text-white">{brandName}</h1>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Agenda, pacientes, cobros y tareas del dia en un solo lugar.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="pill border-white/10 bg-white/10 text-white/78">{role || 'staff'}</span>
                <span className="pill border-white/10 bg-white/10 text-white/78">{supportLine}</span>
              </div>
            </div>

            <nav className="mt-6 space-y-4">
              {visibleGroups.map((group) => (
                <div key={group.group}>
                  <p className="mb-1.5 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/40">
                    {group.group}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                          `block rounded-[1.1rem] px-4 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? 'bg-white text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.16)]'
                              : 'text-white/72 hover:bg-white/8 hover:text-white'
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="soft-divider my-6" />

            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Sesion</p>
              <p className="mt-3 text-lg font-semibold text-white">{user?.name || 'Equipo clinico'}</p>
              <p className="mt-1 text-sm text-white/65">{user?.email || 'staff@clinic.local'}</p>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="mt-5 w-full rounded-xl border border-white/14 bg-white/8 px-4 py-3 text-sm font-semibold text-white hover:bg-white/12 disabled:opacity-50"
                type="button"
              >
                {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesion'}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 xl:pr-2">
          <header className="panel page-hero rounded-[2rem] px-5 py-5 md:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill pill-strong">Gestion clinica</span>
                  <span className="pill">{role || 'staff'}</span>
                </div>
                <h2 className="mt-4 text-3xl text-slate-950 md:text-[2.4rem]">{brandName}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Consulta la agenda, atiende pacientes y revisa la gestion diaria sin dar vueltas por el sistema.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="rounded-[1.35rem] border border-white/60 bg-white/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Usuario activo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{user?.name || 'Equipo clinico'}</p>
                </div>
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="rounded-[1.1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 xl:hidden"
                  type="button"
                >
                  {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesion'}
                </button>
              </div>
            </div>
          </header>

          <div className="nav-scroll mt-4 overflow-x-auto xl:hidden">
            <nav className="panel flex min-w-max gap-2 rounded-[1.5rem] p-2">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-[1rem] px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]'
                        : 'text-slate-600 hover:bg-white hover:text-slate-950'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <main className="mt-4 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
