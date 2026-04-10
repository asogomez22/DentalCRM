import type { Patient } from './patient';

export interface TelemedicineSession {
  id: number;
  clinic_id: number;
  patient_id: number;
  dentist_id: number;
  appointment_id: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  room_code: string;
  room_url: string;
  provider: 'jitsi' | 'whereby' | 'zoom';
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  dentist?: { id: number; name: string; email: string };
}

export type TelemedicineCreatePayload = {
  patient_id: number;
  dentist_id: number;
  appointment_id?: number | null;
  scheduled_at: string;
  provider?: 'jitsi' | 'whereby' | 'zoom';
  notes?: string | null;
};

export type TelemedicineUpdatePayload = Partial<TelemedicineCreatePayload>;
