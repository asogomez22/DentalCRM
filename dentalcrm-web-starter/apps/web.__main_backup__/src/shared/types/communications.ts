export type CommunicationTemplate = {
  id: number;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'portal' | (string & {});
  category: string;
  subject?: string | null;
  body: string;
  is_active: boolean;
};

export type CommunicationCampaign = {
  id: number;
  name: string;
  channel: CommunicationTemplate['channel'];
  segment: 'all_patients' | 'inactive_patients' | 'birthdays' | 'pending_invoices' | (string & {});
  status: 'draft' | 'scheduled' | 'sent' | (string & {});
  subject?: string | null;
  body: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  metrics_json?: Record<string, number> | null;
};

export type CommunicationLog = {
  id: number;
  patient_id?: number | null;
  appointment_id?: number | null;
  invoice_id?: number | null;
  campaign_id?: number | null;
  channel: CommunicationTemplate['channel'];
  direction: 'outbound' | 'inbound' | (string & {});
  status: 'draft' | 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'received' | (string & {});
  subject?: string | null;
  body: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  campaign?: {
    id: number;
    name: string;
  };
};
