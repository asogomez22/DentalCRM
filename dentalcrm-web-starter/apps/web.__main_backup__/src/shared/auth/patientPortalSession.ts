import type { PatientPortalProfile, PublicClinicSettings } from '@/shared/types/portal';

const PORTAL_TOKEN_KEY = 'dentalcrm_patient_portal_token';
const PORTAL_PATIENT_KEY = 'dentalcrm_patient_portal_patient';
const PORTAL_CLINIC_KEY = 'dentalcrm_patient_portal_clinic';

function parseStoredJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function setPatientPortalToken(token: string) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function getPatientPortalToken() {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPatientPortalProfile(patient: PatientPortalProfile | null) {
  if (!patient) {
    localStorage.removeItem(PORTAL_PATIENT_KEY);
    return;
  }

  localStorage.setItem(PORTAL_PATIENT_KEY, JSON.stringify(patient));
}

export function getPatientPortalProfile() {
  return parseStoredJson<PatientPortalProfile>(localStorage.getItem(PORTAL_PATIENT_KEY));
}

export function setPatientPortalClinic(clinic: PublicClinicSettings | null) {
  if (!clinic) {
    localStorage.removeItem(PORTAL_CLINIC_KEY);
    return;
  }

  localStorage.setItem(PORTAL_CLINIC_KEY, JSON.stringify(clinic));
}

export function getPatientPortalClinic() {
  return parseStoredJson<PublicClinicSettings>(localStorage.getItem(PORTAL_CLINIC_KEY));
}

export function clearPatientPortalSession() {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_PATIENT_KEY);
  localStorage.removeItem(PORTAL_CLINIC_KEY);
}

export function isPatientPortalAuthenticated() {
  return Boolean(getPatientPortalToken());
}
