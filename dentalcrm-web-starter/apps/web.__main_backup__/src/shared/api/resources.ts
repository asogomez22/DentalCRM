import type { Appointment, AppointmentCreatePayload, AppointmentFilters, AppointmentUpdatePayload, ClinicSettings, ClinicSummary } from '@/shared/types/appointment';
import type { AvailabilityQuery, AvailabilitySlot, BookingPayload } from '@/shared/types/booking';
import type { Dentist, Treatment } from '@/shared/types/catalog';
import type { AuthResponse, LoginPayload } from '@/shared/types/auth';
import type { Patient, PatientCreatePayload } from '@/shared/types/patient';
import type { Invoice, InvoiceCreatePayload, Payment, PaymentCreatePayload } from '@/shared/types/invoice';
import type { PatientDocument } from '@/shared/types/document';
import type { StaffMember, StaffSchedule, StaffScheduleCreatePayload } from '@/shared/types/staff';
import type { CommunicationCampaign, CommunicationLog, CommunicationTemplate } from '@/shared/types/communications';
import type { AuditLog, ConsentRecord, PatientReferral, PatientReview, PrivacyRequest } from '@/shared/types/compliance';
import type { GeneratedApiKey, IntegrationProvider, WebhookSubscription } from '@/shared/types/ecosystem';
import type { Location, InventoryItem, InventorySummary, PurchaseOrder, StockMovement, Supplier } from '@/shared/types/operations';
import type { Quote, QuoteCreatePayload, QuoteUpdatePayload } from '@/shared/types/quote';
import type { TelemedicineSession, TelemedicineCreatePayload, TelemedicineUpdatePayload } from '@/shared/types/telemedicine';
import type {
  PatientPortalAuthResponse,
  PatientPortalLoginPayload,
  PatientPortalSummary,
  PublicClinicSettings,
} from '@/shared/types/portal';
import type { ReportsSummary } from '@/shared/types/reports';
import { api } from './client';
import { portalApi } from './portalClient';
import { clearAuthSession, setAuthToken, setAuthUser, setClinicSlug } from '@/shared/auth/session';
import { DEFAULT_CLINIC_SLUG } from '@/shared/clinic/defaults';
import {
  clearPatientPortalSession,
  setPatientPortalClinic,
  setPatientPortalProfile,
  setPatientPortalToken,
} from '@/shared/auth/patientPortalSession';

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function sanitizeParams(params?: QueryParams) {
  const normalized: Record<string, string | number | boolean> = {};

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    normalized[key] = value;
  });

  return normalized;
}

function normalizeData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    const next = (payload as { data?: unknown }).data;
    if (next !== undefined) {
      return next as T;
    }
  }

  return payload as T;
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
}

function extractToken(payload: unknown) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const plain = payload as Record<string, unknown>;
  if (typeof plain.token === 'string') {
    return plain.token;
  }

  if (typeof plain.access_token === 'string') {
    return plain.access_token;
  }

  if (plain.data && typeof plain.data === 'object') {
    return extractToken(plain.data);
  }

  return '';
}

function extractUser(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const plain = payload as Record<string, unknown>;
  if (plain.user && typeof plain.user === 'object') {
    return plain.user as AuthResponse['user'];
  }

  if (plain.data && typeof plain.data === 'object' && (plain.data as Record<string, unknown>).user) {
    return (plain.data as Record<string, unknown>).user as AuthResponse['user'];
  }

  return undefined;
}

function syncClinicSlug(settings?: PublicClinicSettings | null) {
  if (settings?.slug) {
    setClinicSlug(settings.slug);
  }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post('/auth/login', payload);
  const token = extractToken(response.data);
  const user = extractUser(response.data);
  const clinicSlug = (response.data && typeof response.data === 'object' && 'clinic' in response.data)
    ? ((response.data as { clinic?: { slug?: string } }).clinic?.slug)
    : null;

  if (!token) {
    throw new Error('No se recibio token de autenticacion');
  }

  setAuthToken(token);
  setAuthUser((user as AuthResponse['user']) || null);
  setClinicSlug(clinicSlug ?? import.meta.env.VITE_CLINIC_SLUG ?? DEFAULT_CLINIC_SLUG);

  return {
    token,
    user,
    token_type: (response.data as { token_type?: string }).token_type,
  };
}

export async function registerClinic(payload: {
  clinic_name: string;
  slug: string;
  owner_name: string;
  owner_email: string;
  password: string;
  public_phone?: string | null;
  public_email?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  plan?: string | null;
}): Promise<AuthResponse & { clinic?: { id: number; slug: string; name: string; plan?: string } }> {
  const response = await api.post('/public/clinics/register', payload);
  const token = extractToken(response.data);
  const user = extractUser(response.data);
  const clinic = (response.data && typeof response.data === 'object' && 'clinic' in response.data)
    ? ((response.data as { clinic?: { id: number; slug: string; name: string; plan?: string } }).clinic)
    : null;

  if (!token) {
    throw new Error('No se recibio token de autenticacion');
  }

  setAuthToken(token);
  setAuthUser((user as AuthResponse['user']) || null);
  setClinicSlug(clinic?.slug ?? import.meta.env.VITE_CLINIC_SLUG ?? DEFAULT_CLINIC_SLUG);

  return {
    token,
    user,
    token_type: (response.data as { token_type?: string }).token_type,
    clinic: clinic ?? undefined,
  };
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAuthSession();
  }
}

export async function fetchDashboardSummary(): Promise<ClinicSummary> {
  const response = await api.get('/dashboard/summary');
  return normalizeData<ClinicSummary>(response.data);
}

export async function fetchPatients(query: { search?: string; page?: number; per_page?: number; last_visit_from?: string; last_visit_to?: string } = {}): Promise<Patient[]> {
  const response = await api.get('/patients', {
    params: sanitizeParams(query),
  });
  return normalizeList<Patient>(response.data);
}

export async function createPatient(payload: PatientCreatePayload): Promise<Patient> {
  const response = await api.post('/patients', payload);
  return normalizeData<Patient>(response.data);
}

export async function updatePatient(id: number, payload: PatientCreatePayload): Promise<Patient> {
  const response = await api.put(`/patients/${id}`, payload);
  return normalizeData<Patient>(response.data);
}

export async function fetchAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  const response = await api.get('/appointments', {
    params: sanitizeParams(filters),
  });
  return normalizeList<Appointment>(response.data);
}

export async function createAppointment(payload: AppointmentCreatePayload): Promise<Appointment> {
  const response = await api.post('/appointments', payload);
  return normalizeData<Appointment>(response.data);
}

export async function updateAppointment(payload: AppointmentUpdatePayload): Promise<Appointment> {
  const response = await api.put(`/appointments/${payload.id}`, payload);
  return normalizeData<Appointment>(response.data);
}

export async function deleteAppointment(id: number): Promise<void> {
  await api.delete(`/appointments/${id}`);
}

export async function fetchAvailability(payload: AvailabilityQuery): Promise<AvailabilitySlot[]> {
  const response = await api.get('/appointments/availability', {
    params: sanitizeParams(payload),
  });
  return normalizeList<AvailabilitySlot>(response.data);
}

export async function createPublicBooking(payload: BookingPayload): Promise<Appointment> {
  const response = await api.post('/appointments/book', payload);
  return normalizeData<Appointment>(response.data);
}

export async function fetchClinicSettings(): Promise<ClinicSettings> {
  const response = await api.get('/clinic/settings');
  return normalizeData<ClinicSettings>(response.data);
}

export async function fetchPublicClinicSettings(): Promise<PublicClinicSettings> {
  const response = await api.get('/clinic/public-settings');
  const settings = normalizeData<PublicClinicSettings>(response.data);
  syncClinicSlug(settings);
  return settings;
}

export async function updateClinicSettings(payload: Partial<ClinicSettings>): Promise<ClinicSettings> {
  const response = await api.put('/clinic/settings', payload);
  return normalizeData<ClinicSettings>(response.data);
}

export async function fetchDentists(): Promise<Dentist[]> {
  const response = await api.get('/users', {
    params: sanitizeParams({ role: 'dentist' }),
  });
  return normalizeList<Dentist>(response.data);
}

export async function fetchTreatments(includeInactive = false): Promise<Treatment[]> {
  const response = await api.get('/treatments', {
    params: sanitizeParams({
      is_active: includeInactive ? undefined : true,
      include_inactive: includeInactive || undefined,
    }),
  });
  return normalizeList<Treatment>(response.data);
}

export async function fetchPublicDentists(): Promise<Dentist[]> {
  const response = await api.get('/catalog/dentists');
  return normalizeList<Dentist>(response.data);
}

export async function fetchPublicTreatments(): Promise<Treatment[]> {
  const response = await api.get('/catalog/treatments');
  return normalizeList<Treatment>(response.data);
}

export async function fetchUsers(): Promise<StaffMember[]> {
  const response = await api.get('/users');
  return normalizeList<StaffMember>(response.data);
}

export async function fetchInvoices(query: { status?: string; patient_id?: number } = {}): Promise<Invoice[]> {
  const response = await api.get('/invoices', {
    params: sanitizeParams(query),
  });
  return normalizeList<Invoice>(response.data);
}

export async function fetchInvoice(id: number): Promise<Invoice> {
  const response = await api.get(`/invoices/${id}`);
  return normalizeData<Invoice>(response.data);
}

export async function createInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  const response = await api.post('/invoices', payload);
  return normalizeData<Invoice>(response.data);
}

export async function updateInvoice(id: number, payload: Partial<InvoiceCreatePayload> & { status?: string }): Promise<Invoice> {
  const response = await api.put(`/invoices/${id}`, payload);
  return normalizeData<Invoice>(response.data);
}

export async function fetchPayments(query: { invoice_id?: number; patient_id?: number } = {}): Promise<Payment[]> {
  const response = await api.get('/payments', {
    params: sanitizeParams(query),
  });
  return normalizeList<Payment>(response.data);
}

export async function createPayment(payload: PaymentCreatePayload): Promise<Payment> {
  const response = await api.post('/payments', payload);
  return normalizeData<Payment>(response.data);
}

export async function fetchDocuments(query: { patient_id?: number; category?: string } = {}): Promise<PatientDocument[]> {
  const response = await api.get('/documents', {
    params: sanitizeParams(query),
  });
  return normalizeList<PatientDocument>(response.data);
}

export async function createDocument(payload: FormData): Promise<PatientDocument> {
  const response = await api.post('/documents', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return normalizeData<PatientDocument>(response.data);
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function downloadDocument(id: number, originalName: string): Promise<void> {
  const response = await api.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = window.document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = originalName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function fetchStaffSchedules(query: { user_id?: number } = {}): Promise<StaffSchedule[]> {
  const response = await api.get('/staff-schedules', {
    params: sanitizeParams(query),
  });
  return normalizeList<StaffSchedule>(response.data);
}

export async function createStaffSchedule(payload: StaffScheduleCreatePayload): Promise<StaffSchedule> {
  const response = await api.post('/staff-schedules', payload);
  return normalizeData<StaffSchedule>(response.data);
}

export async function deleteStaffSchedule(id: number): Promise<void> {
  await api.delete(`/staff-schedules/${id}`);
}

export async function loginPatientPortal(payload: PatientPortalLoginPayload): Promise<PatientPortalAuthResponse> {
  const response = await api.post('/portal/login', payload);
  const data = normalizeData<PatientPortalAuthResponse>(response.data);

  setPatientPortalToken(data.token);
  setPatientPortalProfile(data.patient);
  setPatientPortalClinic(data.clinic);
  syncClinicSlug(data.clinic);

  return data;
}

export async function logoutPatientPortal(): Promise<void> {
  try {
    await portalApi.post('/portal/logout');
  } finally {
    clearPatientPortalSession();
  }
}

export async function fetchPatientPortalSession(): Promise<{
  patient: PatientPortalAuthResponse['patient'];
  clinic: PublicClinicSettings;
}> {
  const response = await portalApi.get('/portal/me');
  const data = normalizeData<{ patient: PatientPortalAuthResponse['patient']; clinic: PublicClinicSettings }>(response.data);
  setPatientPortalProfile(data.patient);
  setPatientPortalClinic(data.clinic);
  syncClinicSlug(data.clinic);
  return data;
}

export async function fetchPatientPortalSummary(): Promise<PatientPortalSummary> {
  const response = await portalApi.get('/portal/summary');
  const data = normalizeData<PatientPortalSummary>(response.data);
  setPatientPortalProfile(data.patient);
  setPatientPortalClinic(data.clinic);
  syncClinicSlug(data.clinic);
  return data;
}

export async function fetchPatientPortalAppointments(): Promise<Appointment[]> {
  const response = await portalApi.get('/portal/appointments');
  return normalizeList<Appointment>(response.data);
}

export async function cancelPatientPortalAppointment(id: number): Promise<Appointment> {
  const response = await portalApi.post(`/portal/appointments/${id}/cancel`);
  return normalizeData<Appointment>(response.data);
}

export async function fetchPatientPortalInvoices(): Promise<Invoice[]> {
  const response = await portalApi.get('/portal/invoices');
  return normalizeList<Invoice>(response.data);
}

export async function fetchPatientPortalDocuments(): Promise<PatientDocument[]> {
  const response = await portalApi.get('/portal/documents');
  return normalizeList<PatientDocument>(response.data);
}

export async function downloadPatientPortalDocument(id: number, originalName: string): Promise<void> {
  const response = await portalApi.get(`/portal/documents/${id}/download`, {
    responseType: 'blob',
  });

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = window.document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = originalName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function fetchReportsSummary(): Promise<ReportsSummary> {
  const response = await api.get('/reports/summary');
  return normalizeData<ReportsSummary>(response.data);
}

export async function fetchCommunicationTemplates(query: { channel?: string; category?: string } = {}): Promise<CommunicationTemplate[]> {
  const response = await api.get('/communications/templates', {
    params: sanitizeParams(query),
  });
  return normalizeList<CommunicationTemplate>(response.data);
}

export async function createCommunicationTemplate(payload: Partial<CommunicationTemplate> & { name: string; channel: string; category: string; body: string }): Promise<CommunicationTemplate> {
  const response = await api.post('/communications/templates', payload);
  return normalizeData<CommunicationTemplate>(response.data);
}

export async function updateCommunicationTemplate(id: number, payload: Partial<CommunicationTemplate>): Promise<CommunicationTemplate> {
  const response = await api.put(`/communications/templates/${id}`, payload);
  return normalizeData<CommunicationTemplate>(response.data);
}

export async function fetchCommunicationCampaigns(): Promise<CommunicationCampaign[]> {
  const response = await api.get('/communications/campaigns');
  return normalizeList<CommunicationCampaign>(response.data);
}

export async function createCommunicationCampaign(payload: Partial<CommunicationCampaign> & { name: string; channel: string; segment: string; body: string }): Promise<CommunicationCampaign> {
  const response = await api.post('/communications/campaigns', payload);
  return normalizeData<CommunicationCampaign>(response.data);
}

export async function sendCommunicationCampaign(id: number): Promise<CommunicationCampaign> {
  const response = await api.post(`/communications/campaigns/${id}/send`);
  return normalizeData<CommunicationCampaign>(response.data);
}

export async function fetchCommunicationLogs(query: { patient_id?: number; channel?: string; direction?: string } = {}): Promise<CommunicationLog[]> {
  const response = await api.get('/communications/logs', {
    params: sanitizeParams(query),
  });
  return normalizeList<CommunicationLog>(response.data);
}

export async function createCommunicationLog(payload: {
  patient_id: number;
  appointment_id?: number | null;
  invoice_id?: number | null;
  channel: string;
  direction: string;
  status?: string;
  subject?: string | null;
  body: string;
}): Promise<CommunicationLog> {
  const response = await api.post('/communications/logs', payload);
  return normalizeData<CommunicationLog>(response.data);
}

export async function fetchLocations(): Promise<Location[]> {
  const response = await api.get('/operations/locations');
  return normalizeList<Location>(response.data);
}

export async function createLocation(payload: Partial<Location> & { name: string }): Promise<Location> {
  const response = await api.post('/operations/locations', payload);
  return normalizeData<Location>(response.data);
}

export async function updateLocation(id: number, payload: Partial<Location>): Promise<Location> {
  const response = await api.put(`/operations/locations/${id}`, payload);
  return normalizeData<Location>(response.data);
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const response = await api.get('/operations/suppliers');
  return normalizeList<Supplier>(response.data);
}

export async function createSupplier(payload: Partial<Supplier> & { name: string }): Promise<Supplier> {
  const response = await api.post('/operations/suppliers', payload);
  return normalizeData<Supplier>(response.data);
}

export async function fetchInventorySummary(): Promise<InventorySummary> {
  const response = await api.get('/operations/inventory/summary');
  return normalizeData<InventorySummary>(response.data);
}

export async function fetchInventoryItems(query: { low_stock?: boolean } = {}): Promise<InventoryItem[]> {
  const response = await api.get('/operations/inventory/items', {
    params: sanitizeParams(query),
  });
  return normalizeList<InventoryItem>(response.data);
}

export async function createInventoryItem(payload: Partial<InventoryItem> & { name: string; category: string; unit: string; unit_cost_cents: number; valuation_method: string }): Promise<InventoryItem> {
  const response = await api.post('/operations/inventory/items', payload);
  return normalizeData<InventoryItem>(response.data);
}

export async function updateInventoryItem(id: number, payload: Partial<InventoryItem>): Promise<InventoryItem> {
  const response = await api.put(`/operations/inventory/items/${id}`, payload);
  return normalizeData<InventoryItem>(response.data);
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  const response = await api.get('/operations/inventory/movements');
  return normalizeList<StockMovement>(response.data);
}

export async function createStockMovement(payload: {
  inventory_item_id: number;
  type: string;
  quantity: number;
  unit_cost_cents?: number;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  moved_at?: string;
}): Promise<StockMovement> {
  const response = await api.post('/operations/inventory/movements', payload);
  return normalizeData<StockMovement>(response.data);
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const response = await api.get('/operations/purchase-orders');
  return normalizeList<PurchaseOrder>(response.data);
}

export async function createPurchaseOrder(payload: {
  supplier_id?: number | null;
  ordered_at?: string;
  expected_at?: string | null;
  status?: string;
  notes?: string | null;
  items: Array<{
    inventory_item_id?: number | null;
    description: string;
    quantity: number;
    unit_cost_cents: number;
  }>;
}): Promise<PurchaseOrder> {
  const response = await api.post('/operations/purchase-orders', payload);
  return normalizeData<PurchaseOrder>(response.data);
}

export async function fetchIntegrations(): Promise<IntegrationProvider[]> {
  const response = await api.get('/ecosystem/integrations');
  return normalizeList<IntegrationProvider>(response.data);
}

export async function updateIntegration(provider: string, payload: { status: string; settings_json?: Record<string, unknown>; last_sync_at?: string | null }): Promise<IntegrationProvider> {
  const response = await api.put(`/ecosystem/integrations/${provider}`, payload);
  return normalizeData<IntegrationProvider>(response.data);
}

export async function fetchApiKeys(): Promise<GeneratedApiKey[]> {
  const response = await api.get('/ecosystem/api-keys');
  return normalizeList<GeneratedApiKey>(response.data);
}

export async function createApiKey(payload: { name: string; scopes_json?: string[] }): Promise<GeneratedApiKey> {
  const response = await api.post('/ecosystem/api-keys', payload);
  return normalizeData<GeneratedApiKey>(response.data);
}

export async function revokeApiKey(id: number): Promise<GeneratedApiKey> {
  const response = await api.delete(`/ecosystem/api-keys/${id}`);
  return normalizeData<GeneratedApiKey>(response.data);
}

export async function fetchWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  const response = await api.get('/ecosystem/webhooks');
  return normalizeList<WebhookSubscription>(response.data);
}

export async function createWebhookSubscription(payload: { name: string; url: string; secret?: string | null; events_json: string[]; is_active?: boolean }): Promise<WebhookSubscription> {
  const response = await api.post('/ecosystem/webhooks', payload);
  return normalizeData<WebhookSubscription>(response.data);
}

export async function deleteWebhookSubscription(id: number): Promise<void> {
  await api.delete(`/ecosystem/webhooks/${id}`);
}

export async function fetchAuditLogs(query: { action?: string } = {}): Promise<AuditLog[]> {
  const response = await api.get('/compliance/audit-logs', {
    params: sanitizeParams(query),
  });
  return normalizeList<AuditLog>(response.data);
}

export async function fetchConsentRecords(query: { patient_id?: number } = {}): Promise<ConsentRecord[]> {
  const response = await api.get('/compliance/consents', {
    params: sanitizeParams(query),
  });
  return normalizeList<ConsentRecord>(response.data);
}

export async function createConsentRecord(payload: {
  patient_id: number;
  document_id?: number | null;
  type: string;
  status: string;
  signature_name?: string | null;
  signed_at?: string | null;
  retention_until?: string | null;
  content_snapshot?: string | null;
}): Promise<ConsentRecord> {
  const response = await api.post('/compliance/consents', payload);
  return normalizeData<ConsentRecord>(response.data);
}

export async function updateConsentRecord(id: number, payload: Partial<ConsentRecord>): Promise<ConsentRecord> {
  const response = await api.put(`/compliance/consents/${id}`, payload);
  return normalizeData<ConsentRecord>(response.data);
}

export async function fetchCompliancePrivacyRequests(query: { status?: string } = {}): Promise<PrivacyRequest[]> {
  const response = await api.get('/compliance/privacy-requests', {
    params: sanitizeParams(query),
  });
  return normalizeList<PrivacyRequest>(response.data);
}

export async function updateCompliancePrivacyRequest(id: number, payload: { status: string; notes?: string | null }): Promise<PrivacyRequest> {
  const response = await api.put(`/compliance/privacy-requests/${id}`, payload);
  return normalizeData<PrivacyRequest>(response.data);
}

export async function exportPatientData(id: number): Promise<void> {
  const response = await api.get(`/compliance/patients/${id}/export`, {
    responseType: 'blob',
  });

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const anchor = window.document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = `patient-export-${id}.json`;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function fetchPatientPortalCommunications(): Promise<CommunicationLog[]> {
  const response = await portalApi.get('/portal/communications');
  return normalizeList<CommunicationLog>(response.data);
}

export async function sendPatientPortalMessage(payload: { subject?: string | null; body: string }): Promise<CommunicationLog> {
  const response = await portalApi.post('/portal/communications', payload);
  return normalizeData<CommunicationLog>(response.data);
}

export async function fetchPatientPortalReviews(): Promise<PatientReview[]> {
  const response = await portalApi.get('/portal/reviews');
  return normalizeList<PatientReview>(response.data);
}

export async function createPatientPortalReview(payload: { appointment_id?: number | null; rating: number; comment?: string | null }): Promise<PatientReview> {
  const response = await portalApi.post('/portal/reviews', payload);
  return normalizeData<PatientReview>(response.data);
}

export async function fetchPatientPortalReferrals(): Promise<PatientReferral[]> {
  const response = await portalApi.get('/portal/referrals');
  return normalizeList<PatientReferral>(response.data);
}

export async function createPatientPortalReferral(payload: { referred_name: string; referred_email?: string | null; referred_phone?: string | null }): Promise<PatientReferral> {
  const response = await portalApi.post('/portal/referrals', payload);
  return normalizeData<PatientReferral>(response.data);
}

export async function fetchPatientPortalPrivacyRequests(): Promise<PrivacyRequest[]> {
  const response = await portalApi.get('/portal/privacy-requests');
  return normalizeList<PrivacyRequest>(response.data);
}

export async function createPatientPortalPrivacyRequest(payload: { type: string; notes?: string | null }): Promise<PrivacyRequest> {
  const response = await portalApi.post('/portal/privacy-requests', payload);
  return normalizeData<PrivacyRequest>(response.data);
}

export async function fetchPatientPortalConsents(): Promise<ConsentRecord[]> {
  const response = await portalApi.get('/portal/consents');
  return normalizeList<ConsentRecord>(response.data);
}

// ── Quotes (Presupuestos) ──────────────────────────────────────────────────

export async function fetchQuotes(params?: { status?: string; patient_id?: number; search?: string }): Promise<Quote[]> {
  const response = await api.get('/quotes', { params: sanitizeParams(params ?? {}) });
  return normalizeList<Quote>(response.data);
}

export async function fetchQuote(id: number): Promise<Quote> {
  const response = await api.get(`/quotes/${id}`);
  return normalizeData<Quote>(response.data);
}

export async function createQuote(payload: QuoteCreatePayload): Promise<Quote> {
  const response = await api.post('/quotes', payload);
  return normalizeData<Quote>(response.data);
}

export async function updateQuote(id: number, payload: QuoteUpdatePayload): Promise<Quote> {
  const response = await api.put(`/quotes/${id}`, payload);
  return normalizeData<Quote>(response.data);
}

export async function sendQuote(id: number): Promise<Quote> {
  const response = await api.post(`/quotes/${id}/send`);
  return normalizeData<Quote>(response.data);
}

export async function acceptQuote(id: number, acceptedItemIds?: number[]): Promise<Quote> {
  const response = await api.post(`/quotes/${id}/accept`, { accepted_item_ids: acceptedItemIds ?? [] });
  return normalizeData<Quote>(response.data);
}

export async function rejectQuote(id: number): Promise<Quote> {
  const response = await api.post(`/quotes/${id}/reject`);
  return normalizeData<Quote>(response.data);
}

export async function deleteQuote(id: number): Promise<void> {
  await api.delete(`/quotes/${id}`);
}

// ── Telemedicine ───────────────────────────────────────────────────────────

export async function fetchTelemedicineSessions(params?: { status?: string; patient_id?: number; dentist_id?: number }): Promise<TelemedicineSession[]> {
  const response = await api.get('/telemedicine', { params: sanitizeParams(params ?? {}) });
  return normalizeList<TelemedicineSession>(response.data);
}

export async function fetchTelemedicineSession(id: number): Promise<TelemedicineSession> {
  const response = await api.get(`/telemedicine/${id}`);
  return normalizeData<TelemedicineSession>(response.data);
}

export async function createTelemedicineSession(payload: TelemedicineCreatePayload): Promise<TelemedicineSession> {
  const response = await api.post('/telemedicine', payload);
  return normalizeData<TelemedicineSession>(response.data);
}

export async function updateTelemedicineSession(id: number, payload: TelemedicineUpdatePayload): Promise<TelemedicineSession> {
  const response = await api.put(`/telemedicine/${id}`, payload);
  return normalizeData<TelemedicineSession>(response.data);
}

export async function startTelemedicineSession(id: number): Promise<TelemedicineSession> {
  const response = await api.post(`/telemedicine/${id}/start`);
  return normalizeData<TelemedicineSession>(response.data);
}

export async function endTelemedicineSession(id: number, notes?: string): Promise<TelemedicineSession> {
  const response = await api.post(`/telemedicine/${id}/end`, { notes });
  return normalizeData<TelemedicineSession>(response.data);
}

export async function cancelTelemedicineSession(id: number): Promise<TelemedicineSession> {
  const response = await api.post(`/telemedicine/${id}/cancel`);
  return normalizeData<TelemedicineSession>(response.data);
}
