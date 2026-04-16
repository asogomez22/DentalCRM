import type { User } from '@/shared/types/auth';
import { DEFAULT_CLINIC_SLUG } from '@/shared/clinic/defaults';

const TOKEN_KEY = 'dentalcrm_auth_token';
const USER_KEY = 'dentalcrm_auth_user';
const CLINIC_SLUG_KEY = 'dentalcrm_clinic_slug';

export type SessionUser = User | null;

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setAuthUser(user: User | null) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null as SessionUser;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null as SessionUser;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthUser() {
  localStorage.removeItem(USER_KEY);
}

export function clearAuthSession() {
  clearAuthToken();
  clearAuthUser();
  clearClinicSession();
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

function normalizeClinicSlug(slug: string | null) {
  const nextSlug = (slug || '').trim().toLowerCase();

  if (!nextSlug) {
    return null;
  }

  // Compatibilidad con la demo anterior.
  if (nextSlug === 'clinica-demo') {
    return DEFAULT_CLINIC_SLUG;
  }

  return nextSlug;
}

export function setClinicSlug(slug: string) {
  const normalizedSlug = normalizeClinicSlug(slug);
  if (!normalizedSlug) {
    localStorage.removeItem(CLINIC_SLUG_KEY);
    return;
  }

  localStorage.setItem(CLINIC_SLUG_KEY, normalizedSlug);
}

export function getClinicSlug() {
  const rawSlug = localStorage.getItem(CLINIC_SLUG_KEY);
  const normalizedSlug = normalizeClinicSlug(rawSlug);

  if (!normalizedSlug) {
    return null;
  }

  if (normalizedSlug !== rawSlug) {
    localStorage.setItem(CLINIC_SLUG_KEY, normalizedSlug);
  }

  return normalizedSlug;
}

export function clearClinicSession() {
  localStorage.removeItem(CLINIC_SLUG_KEY);
}

export function getUserRole() {
  return getAuthUser()?.role || null;
}

export function isAdminUser() {
  const role = (getUserRole() || '').toLowerCase();
  return ['admin', 'manager', 'owner', 'super-admin', 'administrador'].includes(role);
}
