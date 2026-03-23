import type { Patient } from './patient';

export interface QuoteItem {
  id: number;
  quote_id: number;
  treatment_id: number | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  accepted: boolean | null;
}

export interface Quote {
  id: number;
  clinic_id: number;
  patient_id: number;
  user_id: number | null;
  appointment_id: number | null;
  number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes: string | null;
  valid_until: string | null;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  items?: QuoteItem[];
}

export type QuoteItemPayload = {
  id?: number;
  treatment_id?: number | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  accepted?: boolean | null;
};

export type QuoteCreatePayload = {
  patient_id: number;
  user_id?: number | null;
  appointment_id?: number | null;
  title?: string;
  notes?: string | null;
  valid_until?: string | null;
  currency?: string;
  items: QuoteItemPayload[];
};

export type QuoteUpdatePayload = Partial<QuoteCreatePayload>;
