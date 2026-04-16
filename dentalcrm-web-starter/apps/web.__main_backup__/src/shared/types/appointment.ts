export type Appointment = {
  id: number;
  clinic_id: number;
  patient_id: number;
  dentist_id: number;
  treatment_id?: number | null;
  treatment_type?: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  room?: string | null;
  notes?: string | null;
  title?: string;
  patient?: PatientMini;
  dentist?: {
    id?: number;
    name: string;
  };
  treatment?: {
    id?: number;
    name: string;
  };
  invoice?: {
    id: number;
    number: string;
    status: string;
    total_cents: number;
    paid_cents: number;
  };
};

export type PatientMini = {
  id?: number;
  first_name: string;
  last_name: string;
};

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | (string & {});

export type AppointmentCreatePayload = {
  patient_id: number;
  dentist_id: number;
  treatment_id?: number | null;
  treatment_type?: string | null;
  room?: string | null;
  status?: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
};

export type AppointmentUpdatePayload = {
  id: number;
  patient_id?: number;
  dentist_id?: number;
  treatment_id?: number | null;
  treatment_type?: string | null;
  room?: string | null;
  status?: AppointmentStatus;
  starts_at?: string;
  ends_at?: string;
  notes?: string | null;
};

export type AppointmentFilters = {
  date?: string;
  from?: string;
  to?: string;
  dentist_id?: number;
  status?: AppointmentStatus;
};

export type ClinicSummary = {
  date?: string;
  appointments_today: number;
  new_patients_today: number;
  estimated_revenue_cents?: number;
  occupancy_percent?: number;
  currency?: string;
  alerts?: string[];
};

export type ClinicSettings = {
  id?: number;
  clinic_id?: number;
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
  public_phone?: string | null;
  public_email?: string | null;
  booking_enabled?: boolean;
  settings_json?: {
    website?: {
      hero_title?: string;
      hero_copy?: string;
    };
  } | null;
};
