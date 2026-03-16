import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  createConsentRecord,
  exportPatientData,
  fetchAuditLogs,
  fetchCompliancePrivacyRequests,
  fetchConsentRecords,
  fetchDocuments,
  fetchPatients,
  updateCompliancePrivacyRequest,
  updateConsentRecord,
} from '@/shared/api/resources';
import type { ConsentRecord } from '@/shared/types/compliance';

type ConsentFormState = {
  patient_id: string;
  document_id: string;
  type: ConsentRecord['type'];
  status: ConsentRecord['status'];
  signature_name: string;
  signed_at: string;
  retention_until: string;
  content_snapshot: string;
};

const emptyConsentForm = (): ConsentFormState => ({
  patient_id: '',
  document_id: '',
  type: 'treatment',
  status: 'pending',
  signature_name: '',
  signed_at: '',
  retention_until: '',
  content_snapshot: '',
});

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function consentTypeLabel(type: string) {
  switch (type) {
    case 'data_processing':
      return 'Proteccion de datos';
    case 'marketing':
      return 'Comunicaciones';
    default:
      return 'Tratamiento';
  }
}

function consentStatusLabel(status: string) {
  switch (status) {
    case 'signed':
      return 'Firmado';
    case 'revoked':
      return 'Retirado';
    default:
      return 'Pendiente';
  }
}

function privacyStatusLabel(status: string) {
  switch (status) {
    case 'processing':
      return 'En curso';
    case 'resolved':
      return 'Resuelta';
    case 'rejected':
      return 'Rechazada';
    default:
      return 'Pendiente';
  }
}

export function CompliancePage() {
  const queryClient = useQueryClient();
  const [consentForm, setConsentForm] = useState<ConsentFormState>(emptyConsentForm);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'compliance'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', 'compliance'],
    queryFn: () => fetchDocuments(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetchAuditLogs(),
  });

  const { data: consents = [] } = useQuery({
    queryKey: ['compliance-consents'],
    queryFn: () => fetchConsentRecords(),
  });

  const { data: privacyRequests = [] } = useQuery({
    queryKey: ['compliance-privacy-requests'],
    queryFn: () => fetchCompliancePrivacyRequests(),
  });

  useEffect(() => {
    if (consentForm.patient_id || patients.length === 0) {
      return;
    }

    setConsentForm((previous) => ({
      ...previous,
      patient_id: String(patients[0].id),
    }));
  }, [patients, consentForm.patient_id]);

  const createConsentMutation = useMutation({
    mutationFn: createConsentRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-consents'] });
      setConsentForm((previous) => ({
        ...emptyConsentForm(),
        patient_id: previous.patient_id,
      }));
    },
  });

  const updateConsentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ConsentRecord> }) => updateConsentRecord(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-consents'] });
    },
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateCompliancePrivacyRequest(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-privacy-requests'] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportPatientData,
  });

  const stats = useMemo(() => {
    return {
      auditLogs: auditLogs.length,
      signedConsents: consents.filter((consent) => consent.status === 'signed').length,
      pendingConsents: consents.filter((consent) => consent.status === 'pending').length,
      openPrivacy: privacyRequests.filter((request) => request.status !== 'resolved' && request.status !== 'rejected').length,
    };
  }, [auditLogs, consents, privacyRequests]);

  const handleConsentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consentForm.patient_id) {
      return;
    }

    createConsentMutation.mutate({
      patient_id: Number(consentForm.patient_id),
      document_id: consentForm.document_id ? Number(consentForm.document_id) : null,
      type: consentForm.type,
      status: consentForm.status,
      signature_name: consentForm.signature_name.trim() || null,
      signed_at: consentForm.signed_at || null,
      retention_until: consentForm.retention_until || null,
      content_snapshot: consentForm.content_snapshot.trim() || null,
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Privacidad</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Privacidad y permisos</h2>
        <p className="mt-2 text-sm text-slate-500">
          Seguimiento de permisos, solicitudes de datos y actividad registrada del paciente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Actividad" value={String(stats.auditLogs)} hint="Movimientos registrados" />
        <StatCard label="Firmados" value={String(stats.signedConsents)} hint="Consentimientos completados" />
        <StatCard label="Pendientes" value={String(stats.pendingConsents)} hint="A la espera de firma" />
        <StatCard label="Solicitudes abiertas" value={String(stats.openPrivacy)} hint="Aun sin cerrar" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleConsentSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Registrar permiso</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <select
              value={consentForm.patient_id}
              onChange={(event) => setConsentForm((previous) => ({ ...previous, patient_id: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 md:col-span-2"
            >
              <option value="">Selecciona paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
            <select
              value={consentForm.document_id}
              onChange={(event) => setConsentForm((previous) => ({ ...previous, document_id: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">Documento opcional</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.original_name}
                </option>
              ))}
            </select>
            <select
              value={consentForm.type}
              onChange={(event) =>
                setConsentForm((previous) => ({ ...previous, type: event.target.value as ConsentRecord['type'] }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="treatment">Tratamiento</option>
              <option value="data_processing">Proteccion de datos</option>
              <option value="marketing">Comunicaciones</option>
            </select>
            <select
              value={consentForm.status}
              onChange={(event) =>
                setConsentForm((previous) => ({ ...previous, status: event.target.value as ConsentRecord['status'] }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="pending">Pendiente</option>
              <option value="signed">Firmado</option>
              <option value="revoked">Retirado</option>
            </select>
            <input
              value={consentForm.signature_name}
              onChange={(event) => setConsentForm((previous) => ({ ...previous, signature_name: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              placeholder="Nombre firma"
            />
            <input
              type="datetime-local"
              value={consentForm.signed_at}
              onChange={(event) => setConsentForm((previous) => ({ ...previous, signed_at: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            />
            <input
              type="date"
              value={consentForm.retention_until}
              onChange={(event) => setConsentForm((previous) => ({ ...previous, retention_until: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 md:col-span-2"
            />
          </div>

          <textarea
            value={consentForm.content_snapshot}
            onChange={(event) => setConsentForm((previous) => ({ ...previous, content_snapshot: event.target.value }))}
            className="mt-4 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            placeholder="Texto o snapshot del consentimiento"
          />

          <button
            type="submit"
            disabled={createConsentMutation.isPending || !consentForm.patient_id}
            className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            {createConsentMutation.isPending ? 'Guardando...' : 'Guardar permiso'}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Solicitudes de privacidad</h3>
          <div className="mt-5 space-y-3">
            {privacyRequests.length === 0 && <p className="text-sm text-slate-500">No hay solicitudes abiertas.</p>}
            {privacyRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {request.patient?.first_name} {request.patient?.last_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {request.type === 'delete' ? 'Borrado' : 'Exportacion'} - solicitada {formatDateTime(request.requested_at)}
                    </p>
                    {request.notes && <p className="mt-2 text-sm text-slate-600">{request.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['processing', 'resolved', 'rejected'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updatePrivacyMutation.mutate({ id: request.id, status })}
                        disabled={updatePrivacyMutation.isPending || request.status === status}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {privacyStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Consentimientos</h3>
          <div className="mt-4 space-y-3">
            {consents.length === 0 && <p className="text-sm text-slate-500">No hay consentimientos registrados.</p>}
            {consents.map((consent) => (
              <div key={consent.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {consent.patient?.first_name} {consent.patient?.last_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {consentTypeLabel(consent.type)} - {consent.document?.original_name || 'Sin documento'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Firmado: {formatDateTime(consent.signed_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['signed', 'revoked'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          updateConsentMutation.mutate({
                            id: consent.id,
                            payload: {
                              status: status as ConsentRecord['status'],
                              signed_at: status === 'signed' ? new Date().toISOString() : consent.signed_at,
                            },
                          })
                        }
                        disabled={updateConsentMutation.isPending || consent.status === status}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {consentStatusLabel(status)}
                      </button>
                    ))}
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                      {consentStatusLabel(consent.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Exportacion de datos</h3>
            <div className="mt-4 space-y-3">
              {patients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{patient.email || 'Sin email'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportMutation.mutate(patient.id)}
                    disabled={exportMutation.isPending}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Exportar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Actividad reciente</h3>
            <div className="mt-4 space-y-3">
              {auditLogs.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {log.actor_type} #{log.actor_id || '-'} - {formatDateTime(log.created_at)}
                  </p>
                  {log.description && <p className="mt-2 text-sm text-slate-600">{log.description}</p>}
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-sm text-slate-500">Aun no hay trazas registradas.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
