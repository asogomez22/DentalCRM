export type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  birth_date?: string | null;
  notes?: string | null;
};

export type PatientCreatePayload = Omit<Patient, 'id'>;
