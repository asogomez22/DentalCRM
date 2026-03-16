export type Dentist = {
  id: number;
  name: string;
  email?: string | null;
};

export type Treatment = {
  id: number;
  name: string;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
};
