export type LoginPayload = {
  email: string;
  password: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
  clinic_id?: number | null;
};

export type AuthResponse = {
  token: string;
  user?: User;
  token_type?: string;
  expires_at?: string;
};
