import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  createCommunicationCampaign,
  createCommunicationLog,
  createCommunicationTemplate,
  fetchCommunicationCampaigns,
  fetchCommunicationLogs,
  fetchCommunicationTemplates,
  fetchPatients,
  sendCommunicationCampaign,
  updateCommunicationTemplate,
} from '@/shared/api/resources';
import type { CommunicationCampaign, CommunicationLog, CommunicationTemplate } from '@/shared/types/communications';

const channelOptions = ['email', 'sms', 'whatsapp', 'portal'] as const;
const templateCategories = ['appointment', 'billing', 'marketing', 'retention', 'support'] as const;
const segmentOptions = ['all_patients', 'inactive_patients', 'birthdays', 'pending_invoices'] as const;

type TemplateFormState = {
  name: string;
  channel: CommunicationTemplate['channel'];
  category: string;
  subject: string;
  body: string;
  is_active: boolean;
};

type CampaignFormState = {
  name: string;
  channel: CommunicationCampaign['channel'];
  segment: CommunicationCampaign['segment'];
  subject: string;
  body: string;
  scheduled_at: string;
};

type LogFormState = {
  patient_id: string;
  channel: CommunicationLog['channel'];
  direction: CommunicationLog['direction'];
  status: CommunicationLog['status'];
  subject: string;
  body: string;
};

const emptyTemplateForm = (): TemplateFormState => ({
  name: '',
  channel: 'email',
  category: 'appointment',
  subject: '',
  body: '',
  is_active: true,
});

const emptyCampaignForm = (): CampaignFormState => ({
  name: '',
  channel: 'email',
  segment: 'all_patients',
  subject: '',
  body: '',
  scheduled_at: '',
});

const emptyLogForm = (): LogFormState => ({
  patient_id: '',
  channel: 'portal',
  direction: 'outbound',
  status: 'sent',
  subject: '',
  body: '',
});

function channelLabel(channel: string) {
  switch (channel) {
    case 'sms':
      return 'SMS';
    case 'whatsapp':
      return 'WhatsApp';
    case 'portal':
      return 'Portal';
    default:
      return 'Email';
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case 'appointment':
      return 'Citas';
    case 'billing':
      return 'Cobros';
    case 'marketing':
      return 'Promociones';
    case 'retention':
      return 'Seguimiento';
    case 'support':
      return 'Atencion';
    default:
      return category;
  }
}

function segmentLabel(segment: string) {
  switch (segment) {
    case 'inactive_patients':
      return 'Pacientes inactivos';
    case 'birthdays':
      return 'Cumpleanos';
    case 'pending_invoices':
      return 'Pagos pendientes';
    default:
      return 'Todos los pacientes';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'queued':
      return 'En cola';
    case 'delivered':
      return 'Entregado';
    case 'opened':
      return 'Leido';
    case 'failed':
      return 'Con incidencia';
    case 'received':
      return 'Recibido';
    case 'scheduled':
      return 'Programada';
    case 'sent':
      return 'Enviada';
    default:
      return 'Enviado';
  }
}

function directionLabel(direction: string) {
  return direction === 'inbound' ? 'Entrante' : 'Saliente';
}

function getStatusClass(status: string) {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'opened':
      return 'bg-emerald-100 text-emerald-700';
    case 'received':
      return 'bg-teal-100 text-teal-700';
    case 'failed':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CommunicationsPage() {
  const queryClient = useQueryClient();
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(emptyCampaignForm);
  const [logForm, setLogForm] = useState<LogFormState>(emptyLogForm);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['communication-templates'],
    queryFn: () => fetchCommunicationTemplates(),
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['communication-campaigns'],
    queryFn: fetchCommunicationCampaigns,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['communication-logs'],
    queryFn: () => fetchCommunicationLogs(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'communications'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (logForm.patient_id || patients.length === 0) {
      return;
    }

    setLogForm((previous) => ({
      ...previous,
      patient_id: String(patients[0].id),
    }));
  }, [patients, logForm.patient_id]);

  const createTemplateMutation = useMutation({
    mutationFn: createCommunicationTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      setTemplateForm(emptyTemplateForm());
    },
  });

  const toggleTemplateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateCommunicationTemplate(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: createCommunicationCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-campaigns'] });
      setCampaignForm(emptyCampaignForm());
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: sendCommunicationCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
    },
  });

  const createLogMutation = useMutation({
    mutationFn: createCommunicationLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
      setLogForm((previous) => ({
        ...emptyLogForm(),
        patient_id: previous.patient_id,
      }));
    },
  });

  const stats = useMemo(() => {
    const outbound = logs.filter((log) => log.direction === 'outbound');
    const inbound = logs.filter((log) => log.direction === 'inbound');
    const opened = logs.filter((log) => log.status === 'opened').length;
    const activeTemplates = templates.filter((template) => template.is_active).length;

    return {
      outbound: outbound.length,
      inbound: inbound.length,
      openedRate: outbound.length > 0 ? Math.round((opened / outbound.length) * 100) : 0,
      activeTemplates,
    };
  }, [logs, templates]);

  const handleTemplateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTemplateMutation.mutate({
      ...templateForm,
      subject: templateForm.subject.trim() || null,
      body: templateForm.body.trim(),
      name: templateForm.name.trim(),
      category: templateForm.category.trim(),
    });
  };

  const handleCampaignSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCampaignMutation.mutate({
      ...campaignForm,
      name: campaignForm.name.trim(),
      subject: campaignForm.subject.trim() || null,
      body: campaignForm.body.trim(),
      scheduled_at: campaignForm.scheduled_at || null,
    });
  };

  const handleLogSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!logForm.patient_id) {
      return;
    }

    createLogMutation.mutate({
      patient_id: Number(logForm.patient_id),
      channel: logForm.channel,
      direction: logForm.direction,
      status: logForm.status,
      subject: logForm.subject.trim() || null,
      body: logForm.body.trim(),
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand)]">Mensajes</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Comunicaciones</h2>
        <p className="mt-2 text-sm text-slate-500">
          Mensajes, recordatorios y seguimiento del paciente desde un solo sitio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enviados" value={String(stats.outbound)} hint="Mensajes salientes" />
        <StatCard label="Recibidos" value={String(stats.inbound)} hint="Consultas de pacientes" />
        <StatCard label="Leidos" value={`${stats.openedRate}%`} hint="Sobre los mensajes enviados" />
        <StatCard label="Plantillas listas" value={String(stats.activeTemplates)} hint="Preparadas para usar" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form onSubmit={handleTemplateSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Nueva plantilla</h3>
              <p className="mt-1 text-sm text-slate-500">Guarda mensajes frecuentes para citas, cobros y seguimiento.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={templateForm.is_active}
                onChange={(event) =>
                  setTemplateForm((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
              />
              Activa
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Nombre</span>
              <input
                value={templateForm.name}
                onChange={(event) => setTemplateForm((previous) => ({ ...previous, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Recordatorio preoperatorio"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Canal</span>
              <select
                value={templateForm.channel}
                onChange={(event) =>
                  setTemplateForm((previous) => ({
                    ...previous,
                    channel: event.target.value as CommunicationTemplate['channel'],
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {channelOptions.map((channel) => (
                  <option key={channel} value={channel}>
                    {channelLabel(channel)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Categoria</span>
              <select
                value={templateForm.category}
                onChange={(event) => setTemplateForm((previous) => ({ ...previous, category: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {templateCategories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Asunto</span>
              <input
                value={templateForm.subject}
                onChange={(event) => setTemplateForm((previous) => ({ ...previous, subject: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-slate-600">Cuerpo</span>
            <textarea
              value={templateForm.body}
              onChange={(event) => setTemplateForm((previous) => ({ ...previous, body: event.target.value }))}
              className="min-h-36 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              placeholder="Hola {{first_name}}, te recordamos tu cita..."
            />
          </label>

          <button
            type="submit"
            disabled={createTemplateMutation.isPending || !templateForm.name.trim() || !templateForm.body.trim()}
            className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300"
          >
            {createTemplateMutation.isPending ? 'Guardando...' : 'Guardar plantilla'}
          </button>

          {createTemplateMutation.isError && (
            <p className="mt-3 text-sm text-rose-600">
              {(createTemplateMutation.error as Error | undefined)?.message || 'No se pudo guardar la plantilla'}
            </p>
          )}
        </form>

        <form onSubmit={handleCampaignSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Nueva campana</h3>
          <p className="mt-1 text-sm text-slate-500">Prepara envios para recordar citas, recuperar pacientes o comunicar novedades.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Nombre</span>
              <input
                value={campaignForm.name}
                onChange={(event) => setCampaignForm((previous) => ({ ...previous, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Reactiva pacientes inactivos"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Canal</span>
              <select
                value={campaignForm.channel}
                onChange={(event) =>
                  setCampaignForm((previous) => ({
                    ...previous,
                    channel: event.target.value as CommunicationCampaign['channel'],
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {channelOptions.map((channel) => (
                  <option key={channel} value={channel}>
                    {channelLabel(channel)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Segmento</span>
              <select
                value={campaignForm.segment}
                onChange={(event) =>
                  setCampaignForm((previous) => ({
                    ...previous,
                    segment: event.target.value as CommunicationCampaign['segment'],
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {segmentOptions.map((segment) => (
                  <option key={segment} value={segment}>
                    {segmentLabel(segment)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Programar</span>
              <input
                type="datetime-local"
                value={campaignForm.scheduled_at}
                onChange={(event) => setCampaignForm((previous) => ({ ...previous, scheduled_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Asunto</span>
              <input
                value={campaignForm.subject}
                onChange={(event) => setCampaignForm((previous) => ({ ...previous, subject: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-slate-600">Mensaje</span>
            <textarea
              value={campaignForm.body}
              onChange={(event) => setCampaignForm((previous) => ({ ...previous, body: event.target.value }))}
              className="min-h-36 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              placeholder="Hola {{first_name}}, queremos verte de nuevo..."
            />
          </label>

          <button
            type="submit"
            disabled={createCampaignMutation.isPending || !campaignForm.name.trim() || !campaignForm.body.trim()}
            className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300"
          >
            {createCampaignMutation.isPending ? 'Creando...' : 'Guardar campana'}
          </button>

          {createCampaignMutation.isError && (
            <p className="mt-3 text-sm text-rose-600">
              {(createCampaignMutation.error as Error | undefined)?.message || 'No se pudo guardar la campana'}
            </p>
          )}
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Plantillas activas</h3>
              <p className="mt-1 text-sm text-slate-500">Biblioteca central para mensajes habituales.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {templates.length} total
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {templatesLoading && <p className="text-sm text-slate-500">Cargando plantillas...</p>}
            {!templatesLoading && templates.length === 0 && (
              <p className="text-sm text-slate-500">Aun no hay plantillas configuradas.</p>
            )}

            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {channelLabel(template.channel)} - {categoryLabel(template.category)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTemplateMutation.mutate({ id: template.id, isActive: !template.is_active })}
                    disabled={toggleTemplateMutation.isPending}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      template.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {template.is_active ? 'Activa' : 'Inactiva'}
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-600">{template.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Envios programados</h3>
          <div className="mt-5 space-y-3">
            {campaignsLoading && <p className="text-sm text-slate-500">Cargando campanas...</p>}
            {!campaignsLoading && campaigns.length === 0 && (
              <p className="text-sm text-slate-500">Todavia no se han creado campanas.</p>
            )}

            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{campaign.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {channelLabel(campaign.channel)} - {segmentLabel(campaign.segment)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{campaign.body}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(campaign.status)}`}>
                      {statusLabel(campaign.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => sendCampaignMutation.mutate(campaign.id)}
                      disabled={sendCampaignMutation.isPending || campaign.status === 'sent'}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {campaign.status === 'sent' ? 'Enviada' : 'Enviar ahora'}
                    </button>
                  </div>
                </div>
                {(campaign.sent_at || campaign.scheduled_at) && (
                  <p className="mt-3 text-xs text-slate-500">
                    {campaign.sent_at
                      ? `Enviada ${formatDateTime(campaign.sent_at)}`
                      : `Programada ${formatDateTime(campaign.scheduled_at)}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleLogSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Registrar conversacion</h3>
          <p className="mt-1 text-sm text-slate-500">Guarda llamadas o mensajes importantes para que el equipo tenga contexto.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Paciente</span>
              <select
                value={logForm.patient_id}
                onChange={(event) => setLogForm((previous) => ({ ...previous, patient_id: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Selecciona paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Canal</span>
              <select
                value={logForm.channel}
                onChange={(event) =>
                  setLogForm((previous) => ({
                    ...previous,
                    channel: event.target.value as CommunicationLog['channel'],
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {channelOptions.map((channel) => (
                  <option key={channel} value={channel}>
                    {channelLabel(channel)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Direccion</span>
              <select
                value={logForm.direction}
                onChange={(event) =>
                  setLogForm((previous) => ({
                    ...previous,
                    direction: event.target.value as CommunicationLog['direction'],
                    status: event.target.value === 'inbound' ? 'received' : previous.status,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="outbound">Saliente</option>
                <option value="inbound">Entrante</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Estado</span>
              <select
                value={logForm.status}
                onChange={(event) =>
                  setLogForm((previous) => ({
                    ...previous,
                    status: event.target.value as CommunicationLog['status'],
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="sent">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="opened">Leido</option>
                <option value="failed">Con incidencia</option>
                <option value="received">Recibido</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Asunto</span>
              <input
                value={logForm.subject}
                onChange={(event) => setLogForm((previous) => ({ ...previous, subject: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Seguimiento de presupuesto"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-slate-600">Detalle</span>
            <textarea
              value={logForm.body}
              onChange={(event) => setLogForm((previous) => ({ ...previous, body: event.target.value }))}
              className="min-h-36 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              placeholder="Resumen de la conversacion con el paciente"
            />
          </label>

          <button
            type="submit"
            disabled={createLogMutation.isPending || !logForm.patient_id || !logForm.body.trim()}
            className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300"
          >
            {createLogMutation.isPending ? 'Registrando...' : 'Guardar registro'}
          </button>

          {createLogMutation.isError && (
            <p className="mt-3 text-sm text-rose-600">
              {(createLogMutation.error as Error | undefined)?.message || 'No se pudo guardar el registro'}
            </p>
          )}
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Conversaciones recientes</h3>
          <div className="mt-5 space-y-3">
            {logsLoading && <p className="text-sm text-slate-500">Cargando registros...</p>}
            {!logsLoading && logs.length === 0 && (
              <p className="text-sm text-slate-500">Todavia no hay mensajes recientes.</p>
            )}

            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {log.patient ? `${log.patient.first_name} ${log.patient.last_name}` : 'Paciente'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {channelLabel(log.channel)} - {directionLabel(log.direction)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(log.status)}`}>
                    {statusLabel(log.status)}
                  </span>
                </div>
                {log.subject && <p className="mt-3 text-sm font-semibold text-slate-900">{log.subject}</p>}
                <p className="mt-2 text-sm text-slate-600">{log.body}</p>
                <p className="mt-3 text-xs text-slate-500">{formatDateTime(log.sent_at || log.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
