export type IntegrationProvider = {
  provider: string;
  label: string;
  category: string;
  status: 'disconnected' | 'configured' | 'active' | 'paused' | (string & {});
  last_sync_at?: string | null;
  settings_json?: Record<string, unknown> | null;
};

export type GeneratedApiKey = {
  id: number;
  name: string;
  token?: string;
  scopes_json?: string[] | null;
  last_used_at?: string | null;
  is_active?: boolean;
  created_at: string;
};

export type WebhookSubscription = {
  id: number;
  name: string;
  url: string;
  secret?: string | null;
  events_json: string[];
  last_triggered_at?: string | null;
  is_active: boolean;
};
