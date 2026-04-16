import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { clearAuthSession, getAuthUser, getUserRole, isAdminUser } from '@/shared/auth/session';
import { fetchClinicSettings, logout } from '@/shared/api/resources';
import {
  DEFAULT_CLINIC_BRAND,
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
  icon: NavIcon;
  adminOnly?: boolean;
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    group: 'General',
    items: [
      { to: '/dashboard', label: 'Resumen', icon: 'dashboard' },
      { to: '/patients', label: 'Pacientes', icon: 'patients' },
      { to: '/appointments', label: 'Agenda', icon: 'appointments' },
      { to: '/documents', label: 'Documentos', icon: 'documents' },
    ],
  },
  {
    group: 'Clinica',
    items: [
      { to: '/finance', label: 'Finanzas', icon: 'finance', adminOnly: true },
      { to: '/quotes', label: 'Presupuestos', icon: 'quotes', adminOnly: true },
      { to: '/telemedicine', label: 'Telemedicina', icon: 'telemedicine', adminOnly: true },
      { to: '/communications', label: 'Comunicaciones', icon: 'communications', adminOnly: true },
    ],
  },
  {
    group: 'Gestion',
    items: [
      { to: '/operations', label: 'Operaciones', icon: 'operations', adminOnly: true },
      { to: '/reports', label: 'Indicadores', icon: 'reports', adminOnly: true },
      { to: '/staff', label: 'Equipo', icon: 'staff', adminOnly: true },
      { to: '/settings', label: 'Ajustes', icon: 'settings', adminOnly: true },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { to: '/ecosystem', label: 'Integraciones', icon: 'ecosystem', adminOnly: true },
      { to: '/compliance', label: 'Privacidad', icon: 'compliance', adminOnly: true },
    ],
  },
];

const links = navGroups.flatMap((g) => g.items);

function formatRoleLabel(role?: string | null) {
  switch ((role || '').trim().toLowerCase()) {
    case 'admin':
      return 'Admin';
    case 'super-admin':
      return 'Super Admin';
    case 'manager':
      return 'Manager';
    case 'owner':
      return 'Owner';
    case 'dentist':
      return 'Dentista';
    case 'assistant':
      return 'Auxiliar';
    case 'reception':
      return 'Recepcion';
    case 'administrador':
      return 'Administrador';
    case 'direccion':
      return 'Direccion';
    default:
      return role || DEFAULT_STAFF_ROLE;
  }
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
  const roleLabel = formatRoleLabel(role || DEFAULT_STAFF_ROLE);

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

  const visibleLinks = useMemo(() => links.filter((l) => !l.adminOnly || isAdmin), [isAdmin]);

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((l) => !l.adminOnly || isAdmin) }))
      .filter((g) => g.items.length > 0);
  }, [isAdmin]);

  return (
    <div className="min-h-screen text-slate-900" style={styleVars}>
      <div className="flex min-h-screen w-full flex-col gap-4 px-3 py-3 md:px-4 md:py-4 xl:grid xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-0 xl:px-0 xl:py-0">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden xl:block">
          <div className="sidebar-slim fixed inset-y-0 left-0 flex w-[240px] flex-col">
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-1">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/12">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-white/90" aria-hidden="true">
                  <path d="M12 4.75 5.5 8.5 12 12.25 18.5 8.5 12 4.75Z" />
                  <path d="M5.5 8.5v7L12 19.25l6.5-3.75v-7" />
                </svg>
              </span>
              <p className="min-w-0 truncate text-sm font-bold text-white">{brandName}</p>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav mt-3 flex-1 overflow-y-auto px-3">
              {visibleGroups.map((group) => (
                <div key={group.group} className="mt-5 first:mt-0">
                  <p className="mb-1.5 px-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/30">
                    {group.group}
                  </p>
                  {group.items.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
                      }
                    >
                      <SidebarIcon icon={link.icon} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>

            {/* User: avatar + name + settings + logout */}
            <div className="flex items-center gap-2 border-t border-white/8 px-4 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-400/30 to-amber-400/20 text-xs font-bold text-white">
                {(user?.name || DEFAULT_STAFF_NAME).charAt(0).toUpperCase()}
              </span>
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white/75">{user?.name || DEFAULT_STAFF_NAME}</p>
              <NavLink
                to="/settings"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/35 hover:bg-white/8 hover:text-white/70"
                title="Ajustes"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                  <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
                  <path d="M18.25 13.5a1.6 1.6 0 0 0 .32 1.77l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46V19.5a2 2 0 1 1-4 0v-.07a1.6 1.6 0 0 0-.98-1.46 1.6 1.6 0 0 0-1.76.32l-.06.05a2 2 0 0 1-2.82-2.83l.05-.05a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H4.5a2 2 0 1 1 0-4h.07a1.6 1.6 0 0 0 1.46-.98 1.6 1.6 0 0 0-.32-1.76l-.05-.06a2 2 0 1 1 2.83-2.82l.05.05a1.6 1.6 0 0 0 1.77.32 1.6 1.6 0 0 0 .97-1.46V4.5a2 2 0 1 1 4 0v.07a1.6 1.6 0 0 0 .98 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.05a2 2 0 0 1 2.82 2.83l-.05.05a1.6 1.6 0 0 0-.32 1.77 1.6 1.6 0 0 0 1.46.97h.07a2 2 0 1 1 0 4h-.07a1.6 1.6 0 0 0-1.46.98Z" />
                </svg>
              </NavLink>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/35 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                type="button"
                title="Cerrar sesion"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                  <path d="M15.75 8.75 19.25 12l-3.5 3.25" />
                  <path d="M19 12H9.75" />
                  <path d="M15.25 4.75H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2h8.5" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 xl:px-5 xl:py-4">
          {/* Mobile top bar */}
          <header className="panel rounded-2xl px-4 py-4 xl:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-950">{brandName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">{user?.name || DEFAULT_STAFF_NAME}</span>
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  type="button"
                >
                  {logoutMutation.isPending ? '...' : 'Salir'}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile nav */}
          <div className="mt-3 xl:hidden">
            <div className="nav-scroll overflow-x-auto">
              <nav className="flex min-w-max gap-1.5 pb-1">
                {visibleLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `sidebar-dock-link ${isActive ? 'sidebar-dock-link--active' : ''}`
                    }
                  >
                    <SidebarIcon icon={link.icon} className="h-4 w-4" />
                    <span className="whitespace-nowrap text-xs font-semibold">{link.label}</span>
                  </NavLink>
                ))}
              </nav>
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
