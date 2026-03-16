import type { Appointment } from '@/shared/types/appointment';

export type PublicClinicSettings = {
  slug?: string;
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
  public_phone?: string | null;
  public_email?: string | null;
  booking_enabled?: boolean;
  website?: {
    hero_title?: string;
    hero_copy?: string;
  };
};

export type PatientPortalProfile = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  portal_points?: number;
};

export type PatientPortalLoginPayload = {
  email: string;
  access_key: string;
};

export type PatientPortalAuthResponse = {
  token: string;
  token_type?: string;
  patient: PatientPortalProfile;
  clinic: PublicClinicSettings;
};

export type PatientPortalSummary = {
  patient: PatientPortalProfile;
  clinic: PublicClinicSettings;
  upcoming_appointments_count: number;
  documents_count: number;
  pending_invoices_count: number;
  pending_balance_cents: number;
  next_appointment?: Appointment | null;
};
