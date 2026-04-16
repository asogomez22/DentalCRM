import axios from 'axios';
import { clearAuthSession, getAuthToken, getClinicSlug } from '@/shared/auth/session';
import { DEFAULT_CLINIC_SLUG } from '@/shared/clinic/defaults';
import { getActiveClinicSlug } from '@/shared/clinic/paths';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    'X-Clinic-Slug': import.meta.env.VITE_CLINIC_SLUG ?? DEFAULT_CLINIC_SLUG,
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const clinicSlug = getActiveClinicSlug() ?? getClinicSlug() ?? import.meta.env.VITE_CLINIC_SLUG ?? DEFAULT_CLINIC_SLUG;
  config.headers['X-Clinic-Slug'] = clinicSlug;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event('dentalcrm:auth-expired'));
    }
    return Promise.reject(error);
  },
);
