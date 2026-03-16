export type PatientDocument = {
  id: number;
  patient_id: number;
  uploaded_by?: number | { id: number; name: string } | null;
  category: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  disk: string;
  path: string;
  created_at: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
};
