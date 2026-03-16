export type InvoiceItem = {
  id?: number;
  treatment_id?: number | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};

export type Invoice = {
  id: number;
  patient_id: number;
  appointment_id?: number | null;
  number: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled' | (string & {});
  issued_at: string;
  due_at?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  paid_cents: number;
  currency: string;
  notes?: string | null;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  items?: InvoiceItem[];
  payments?: Payment[];
};

export type InvoiceCreatePayload = {
  patient_id: number;
  appointment_id?: number | null;
  issued_at: string;
  due_at?: string | null;
  currency?: string;
  notes?: string | null;
  items: Array<{
    treatment_id?: number | null;
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

export type Payment = {
  id: number;
  invoice_id: number;
  patient_id: number;
  amount_cents: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'financed' | 'online' | (string & {});
  status: 'pending' | 'completed' | 'failed' | (string & {});
  paid_at: string;
  reference?: string | null;
  notes?: string | null;
  invoice?: {
    id: number;
    number: string;
    total_cents: number;
    paid_cents: number;
    status: string;
  };
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
};

export type PaymentCreatePayload = {
  invoice_id: number;
  amount_cents: number;
  method: Payment['method'];
  status?: Payment['status'];
  paid_at?: string;
  reference?: string | null;
  notes?: string | null;
};
