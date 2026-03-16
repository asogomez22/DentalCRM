import { getClinicSlug, setClinicSlug } from '@/shared/auth/session';

const reservedPortalSegments = new Set(['acceso', 'mi-area', 'reservar', 'login', 'area', 'booking']);

export function resolveClinicSlugFromPathname(pathname?: string) {
  if (typeof window === 'undefined' && !pathname) {
    return null;
  }

  const nextPathname = pathname ?? window.location.pathname;
  const match = nextPathname.match(/^\/portal\/([^/]+)/);

  if (!match?.[1]) {
    return null;
  }

  const candidate = match[1].trim().toLowerCase();
  return reservedPortalSegments.has(candidate) ? null : candidate;
}

export function getActiveClinicSlug() {
  return (
    resolveClinicSlugFromPathname() ??
    getClinicSlug() ??
    import.meta.env.VITE_CLINIC_SLUG ??
    'clinica-demo'
  );
}

export function syncClinicSlug(clinicSlug?: string | null) {
  const nextClinicSlug = (clinicSlug || '').trim().toLowerCase();

  if (!nextClinicSlug) {
    return getActiveClinicSlug();
  }

  if (getClinicSlug() !== nextClinicSlug) {
    setClinicSlug(nextClinicSlug);
  }

  return nextClinicSlug;
}

export function getClinicPortalPath(
  section: 'landing' | 'login' | 'area' | 'booking',
  clinicSlug?: string | null,
) {
  const activeClinicSlug = (clinicSlug || '').trim().toLowerCase();
  const base = activeClinicSlug ? `/portal/${activeClinicSlug}` : '/portal';

  switch (section) {
    case 'login':
      return `${base}/acceso`;
    case 'area':
      return `${base}/mi-area`;
    case 'booking':
      return `${base}/reservar`;
    default:
      return base;
  }
}
