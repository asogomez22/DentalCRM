export type AuditLog = {
  id: number;
  actor_type: string;
  actor_id?: number | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  description?: string | null;
  ip_address?: string | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
};

export type ConsentRecord = {
  id: number;
  patient_id: number;
  document_id?: number | null;
  type: 'data_processing' | 'treatment' | 'marketing' | (string & {});
  status: 'pending' | 'signed' | 'revoked' | (string & {});
  signature_name?: string | null;
  ip_address?: string | null;
  signed_at?: string | null;
  retention_until?: string | null;
  content_snapshot?: string | null;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  document?: {
    id: number;
    original_name: string;
  };
};

export type PrivacyRequest = {
  id: number;
  patient_id: number;
  type: 'export' | 'delete' | (string & {});
  status: 'requested' | 'processing' | 'resolved' | 'rejected' | (string & {});
  notes?: string | null;
  requested_at: string;
  resolved_at?: string | null;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string | null;
  };
};

export type PatientReview = {
  id: number;
  patient_id: number;
  appointment_id?: number | null;
  rating: number;
  comment?: string | null;
  status: string;
  created_at: string;
};

export type PatientReferral = {
  id: number;
  referrer_patient_id: number;
  referral_code: string;
  referred_name: string;
  referred_email?: string | null;
  referred_phone?: string | null;
  status: string;
  reward_points: number;
  created_at: string;
};
