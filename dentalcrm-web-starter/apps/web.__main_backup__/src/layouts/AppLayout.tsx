import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { clearAuthSession, getAuthUser, getUserRole, isAdminUser } from '@/shared/auth/session';
import { fetchClinicSettings, logout } from '@/shared/api/resources';
import {
  DEFAULT_CLINIC_BRAND,
  DEFAULT_CLINIC_PHONE,
  DEFAULT_STAFF_EMAIL,
  DEFAULT_STAFF_NAME,
  DEFAULT_STAFF_ROLE,
} from '@/shared/clinic/defaults';

type NavIcon =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'documents'
  | 'finance'
  | 'quotes'
  | 'telemedicine'
  | 'communications'
  | 'operations'
  | 'reports'
  | 'staff'
  | 'settings'
  | 'ecosystem'
  | 'compliance';

type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: NavIcon;
  adminOnly?: boolean;
};

type NavGroup = {
  group: string;
  caption: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    group: 'General',
    caption: 'Flujo diario',
    items: [
      {
        to: '/dashboard',
        label: 'Resumen',
        description: 'Pulso rapido de citas, cobros y alertas.',
        icon: 'dashboard',
      },
      {
        to: '/patients',
        label: 'Pacientes',
        description: 'Historias, seguimientos y proximos pasos.',
        icon: 'patients',
      },
      {
        to: '/appointments',
        label: 'Agenda',
        description: 'Turnos, estados y ocupacion del dia.',
        icon: 'appointments',
      },
      {
        to: '/documents',
        label: 'Documentos',
        description: 'Consentimientos, archivos y material clinico.',
        icon: 'documents',
      },
    ],
  },
  {
    group: 'Clinica',
    caption: 'Frente comercial',
    items: [
      {
        to: '/finance',
        label: 'Finanzas',
        description: 'Cobros, facturas y salud economica.',
        icon: 'finance',
        adminOnly: true,
      },
      {
        to: '/quotes',
        label: 'Presupuestos',
        description: 'Tratamientos propuestos y cierres pendientes.',
        icon: 'quotes',
        adminOnly: true,
      },
      {
        to: '/telemedicine',
        label: 'Telemedicina',
        description: 'Consultas remotas y atencion asincrona.',
        icon: 'telemedicine',
        adminOnly: true,
      },
      {
        to: '/communications',
        label: 'Comunicaciones',
        description: 'Mensajes, recordatorios y campanas.',
        icon: 'communications',
        adminOnly: true,
      },
    ],
  },
  {
    group: 'Gestion',
    caption: 'Backoffice',
    items: [
      {
        to: '/operations',
        label: 'Operaciones',
        description: 'Tareas, suministros y procesos internos.',
        icon: 'operations',
        adminOnly: true,
      },
      {
        to: '/reports',
        label: 'Indicadores',
        description: 'Metricas ejecutivas y tendencias clave.',
        icon: 'reports',
        adminOnly: true,
      },
      {
        to: '/staff',
        label: 'Equipo',
        description: 'Roles, productividad y organizacion.',
        icon: 'staff',
        adminOnly: true,
      },
      {
        to: '/settings',
        label: 'Clinica',
        description: 'Marca, datos publicos y configuracion.',
        icon: 'settings',
        adminOnly: true,
      },
    ],
  },
  {
    group: 'Sistema',
    caption: 'Seguridad y stack',
    items: [
      {
        to: '/ecosystem',
        label: 'Integraciones',
        description: 'Conexiones externas y herramientas activas.',
        icon: 'ecosystem',
        adminOnly: true,
      },
      {
        to: '/compliance',
        label: 'Privacidad',
        description: 'Consentimientos, acceso y cumplimiento.',
        icon: 'compliance',
        adminOnly: true,
      },
    ],
  },
];

// Flat list for mobile nav
const links = navGroups.flatMap((g) => g.items);

function isRouteActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarIcon({ icon, className = 'h-4 w-4' }: { icon: NavIcon; className?: string }) {
  switch (icon) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M4.75 5.75h6.5v5.5h-6.5z" />
          <path d="M12.75 5.75h6.5v9h-6.5z" />
          <path d="M4.75 13.75h6.5v4.5h-6.5z" />
          <path d="M12.75 17.25h6.5v1H12.75z" />
        </svg>
      );
    case 'patients':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 13.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M5.25 18.75a6.75 6.75 0 0 1 13.5 0" />
        </svg>
      );
    case 'appointments':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M7.25 4.75v3.5" />
          <path d="M16.75 4.75v3.5" />
          <path d="M4.75 9.25h14.5" />
          <rect x="4.75" y="6.75" width="14.5" height="12.5" rx="2.5" />
          <path d="m9 13 2 2 4-4" />
        </svg>
      );
    case 'documents':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M8.25 4.75h6l4 4v10.5H8.25a2.5 2.5 0 0 1-2.5-2.5V7.25a2.5 2.5 0 0 1 2.5-2.5Z" />
          <path d="M14.25 4.75v4h4" />
          <path d="M9 13h6" />
          <path d="M9 16h4.5" />
        </svg>
      );
    case 'finance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 4.75v14.5" />
          <path d="M15.75 7.5c0-1.5-1.64-2.75-3.75-2.75S8.25 6 8.25 7.5 9.89 10.25 12 10.25s3.75 1.25 3.75 2.75-1.64 2.75-3.75 2.75S8.25 14.5 8.25 13" />
        </svg>
      );
    case 'quotes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M7.5 6.75h9" />
          <path d="M7.5 10.75h9" />
          <path d="M7.5 14.75h5.5" />
          <rect x="4.75" y="4.75" width="14.5" height="14.5" rx="2.5" />
        </svg>
      );
    case 'telemedicine':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <rect x="4.75" y="6.25" width="10.5" height="11.5" rx="2.5" />
          <path d="m15.25 10 4-2v8l-4-2" />
          <path d="M9 9.75v4.5" />
          <path d="M6.75 12h4.5" />
        </svg>
      );
    case 'communications':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M5.75 7.75h12.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H8.5l-3.75 2v-10.5a2 2 0 0 1 2-2Z" />
          <path d="M8.5 12h7" />
          <path d="M8.5 15h4.5" />
        </svg>
      );
    case 'operations':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="m8.25 14.5-2.5 4.75" />
          <path d="m15.75 14.5 2.5 4.75" />
          <path d="M12 4.75 5.5 8.5 12 12.25 18.5 8.5 12 4.75Z" />
          <path d="M5.5 8.5v7L12 19.25l6.5-3.75v-7" />
        </svg>
      );
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M6 17.25h12" />
          <path d="M8.25 15V11.5" />
          <path d="M12 15V8.25" />
          <path d="M15.75 15V10" />
          <path d="m7.5 8.5 3 2 5.25-4.25" />
        </svg>
      );
    case 'staff':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M9 12.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M16.25 11.5a2.25 2.25 0 1 0 0-4.5" />
          <path d="M4.75 18a5 5 0 0 1 8.5-3.5" />
          <path d="M14 17.75a3.5 3.5 0 0 1 5.25-3" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
          <path d="M18.25 13.5a1.6 1.6 0 0 0 .32 1.77l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V19.5a2 2 0 1 1-4 0v-.07a1.6 1.6 0 0 0-.98-1.46 1.6 1.6 0 0 0-1.76.32l-.06.05a2 2 0 0 1-2.82-2.83l.05-.05a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H4.5a2 2 0 1 1 0-4h.07a1.6 1.6 0 0 0 1.46-.98 1.6 1.6 0 0 0-.32-1.76l-.05-.06a2 2 0 1 1 2.83-2.82l.05.05a1.6 1.6 0 0 0 1.77.32 1.6 1.6 0 0 0 .97-1.46V4.5a2 2 0 1 1 4 0v.07a1.6 1.6 0 0 0 .98 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.05a2 2 0 0 1 2.82 2.83l-.05.05a1.6 1.6 0 0 0-.32 1.77 1.6 1.6 0 0 0 1.46.97h.07a2 2 0 1 1 0 4h-.07a1.6 1.6 0 0 0-1.46.98Z" />
        </svg>
      );
    case 'ecosystem':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M9 6.5h6" />
          <path d="M7 12h10" />
          <path d="M9 17.5h6" />
          <path d="M6.25 6.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
          <path d="M20.25 12a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
          <path d="M6.25 17.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
        </svg>
      );
    case 'compliance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 4.75 6.25 7v4.75c0 3.6 2.38 6.9 5.75 7.95 3.37-1.05 5.75-4.35 5.75-7.95V7L12 4.75Z" />
          <path d="m9.5 12.25 1.75 1.75 3.5-4" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getAuthUser();
  const role = getUserRole();
  const isAdmin = isAdminUser();

  const { data: settings } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: fetchClinicSettings,
    staleTime: 60_000,
  });

  const brandName = settings?.brand_name || DEFAULT_CLINIC_BRAND;
  const mainColor = settings?.primary_color || '#0f766e';
  const supportLine = settings?.public_phone || settings?.public_email || DEFAULT_CLINIC_PHONE;

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
    return links.filter((link) => !link.adminOnly || isAdmin);
  }, [isAdmin]);

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((l) => !l.adminOnly || isAdmin) }))
      .filter((g) => g.items.length > 0);
  }, [isAdmin]);

  const activeItem = useMemo(() => {
    return visibleLinks.find((link) => isRouteActive(location.pathname, link.to)) ?? visibleLinks[0];
  }, [location.pathname, visibleLinks]);

  const activeGroup = useMemo(() => {
    return visibleGroups.find((group) => group.items.some((link) => link.to === activeItem?.to));
  }, [activeItem, visibleGroups]);

  return (
    <div className="min-h-screen text-slate-900">
      <div className="flex min-h-screen w-full flex-col gap-4 px-3 py-3 md:px-4 md:py-4 xl:grid xl:grid-cols-[320px_minmax(0,1fr)]" style={styleVars}>
        <aside className="hidden xl:block">
          <div className="panel-dark sidebar-shell sticky top-4 flex min-h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex-col rounded-[2rem] p-6">
            <div className="sidebar-brand page-hero rounded-[1.6rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">{DEFAULT_CLINIC_BRAND}</p>
                  <h1 className="mt-3 text-3xl text-white">{brandName}</h1>
                </div>
                <span className="sidebar-status">Online</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Agenda, pacientes, cobros y tareas del dia en un solo lugar.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="pill border-white/10 bg-white/10 text-white/78">{role || DEFAULT_STAFF_ROLE}</span>
                <span className="pill border-white/10 bg-white/10 text-white/78">{supportLine}</span>
              </div>
              <div className="sidebar-focus mt-5">
                <div>
                  <p className="sidebar-focus__eyebrow">En foco</p>
                  <p className="sidebar-focus__title">{activeItem?.label || 'Resumen'}</p>
                  <p className="sidebar-focus__text">
                    {activeItem?.description || 'Accede rapido al flujo principal de la clinica.'}
                  </p>
                </div>
                <span className="sidebar-focus__badge">{activeGroup?.group || 'General'}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="sidebar-metric">
                  <p className="sidebar-metric__label">Accesos</p>
                  <p className="sidebar-metric__value">{visibleLinks.length}</p>
                </div>
                <div className="sidebar-metric">
                  <p className="sidebar-metric__label">Vista</p>
                  <p className="sidebar-metric__value">{isAdmin ? 'Admin' : 'Staff'}</p>
                </div>
              </div>
            </div>

            <nav className="mt-6 flex-1 overflow-y-auto pr-1">
              <div className="space-y-4">
                {visibleGroups.map((group) => (
                  <div key={group.group} className="sidebar-group">
                    <div className="sidebar-group__header">
                      <div>
                        <p className="sidebar-group__eyebrow">{group.caption}</p>
                        <h2 className="sidebar-group__title">{group.group}</h2>
                      </div>
                      <span className="sidebar-group__count">{group.items.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {group.items.map((link) => (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                          }
                        >
                          <span className="sidebar-link__icon">
                            <SidebarIcon icon={link.icon} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="sidebar-link__label">{link.label}</span>
                            <span className="sidebar-link__description">{link.description}</span>
                          </span>
                          <span className="sidebar-link__chevron" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                              <path d="m9 6 6 6-6 6" />
                            </svg>
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="soft-divider my-6" />

            <div className="sidebar-footer rounded-[1.5rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Sesion</p>
                <span className="sidebar-status sidebar-status--soft">{activeGroup?.group || 'General'}</span>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{user?.name || DEFAULT_STAFF_NAME}</p>
              <p className="mt-1 text-sm text-white/65">{user?.email || DEFAULT_STAFF_EMAIL}</p>
              <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">Canal publico</p>
                <p className="mt-1 text-sm font-semibold text-white/88">{supportLine}</p>
              </div>
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
                  <span className="pill pill-strong">{DEFAULT_CLINIC_BRAND}</span>
                  <span className="pill">{role || DEFAULT_STAFF_ROLE}</span>
                </div>
                <h2 className="mt-4 text-3xl text-slate-950 md:text-[2.4rem]">{brandName}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Consulta la agenda, atiende pacientes y revisa la gestion diaria sin dar vueltas por el sistema.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="rounded-[1.35rem] border border-white/60 bg-white/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Usuario activo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{user?.name || DEFAULT_STAFF_NAME}</p>
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

          <div className="mt-4 xl:hidden">
            <div className="panel page-hero rounded-[1.6rem] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Navegacion</p>
                  <h3 className="mt-2 text-2xl text-slate-950">{activeItem?.label || 'Resumen'}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    {activeItem?.description || 'Accesos directos a las vistas principales de la clinica.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="pill pill-strong">{activeGroup?.group || 'General'}</span>
                  <span className="pill">{visibleLinks.length} accesos</span>
                </div>
              </div>

              <div className="nav-scroll mt-4 overflow-x-auto">
                <nav className="flex min-w-max gap-2 pb-1">
                  {visibleLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `sidebar-dock-link ${isActive ? 'sidebar-dock-link--active' : ''}`
                      }
                    >
                      <span className="sidebar-dock-link__icon">
                        <SidebarIcon icon={link.icon} className="h-4 w-4" />
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold">{link.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          <main className="mt-4 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
