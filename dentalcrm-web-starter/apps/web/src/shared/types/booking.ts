export type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
  room?: string | null;
  dentist_id?: number | null;
  dentist_name?: string | null;
  treatment_id?: number | null;
  label?: string;
};

export type BookingPayload = {
  patient: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  treatment_id: number | null;
  dentist_id: number | null;
  slot: string;
};

export type AvailabilityQuery = {
  date: string;
  treatment_id?: number | null;
  dentist_id?: number | null;
};
