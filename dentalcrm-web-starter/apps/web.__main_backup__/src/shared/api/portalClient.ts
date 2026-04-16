import axios from 'axios';
import { getClinicSlug } from '@/shared/auth/session';
import { clearPatientPortalSession, getPatientPortalToken } from '@/shared/auth/patientPortalSession';
import { DEFAULT_CLINIC_SLUG } from '@/shared/clinic/defaults';
import { getActiveClinicSlug } from '@/shared/clinic/paths';

export const portalApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    'X-Clinic-Slug': import.meta.env.VITE_CLINIC_SLUG ?? DEFAULT_CLINIC_SLUG,
  },
});

portalApi.interceptors.request.use((config) => {
  const token = getPatientPortalToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const clinicSlug = getActiveClinicSlug() ?? getClinicSlug() ?? import.meta.env.VITE_CLINIC_SLUG ?? DEFAULT_CLINIC_SLUG;
  config.headers['X-Clinic-Slug'] = clinicSlug;

  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearPatientPortalSession();
      window.dispatchEvent(new Event('dentalcrm:patient-auth-expired'));
    }

    return Promise.reject(error);
  },
);
