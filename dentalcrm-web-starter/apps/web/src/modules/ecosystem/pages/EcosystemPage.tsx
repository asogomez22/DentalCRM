import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  createApiKey,
  createWebhookSubscription,
  deleteWebhookSubscription,
  fetchApiKeys,
  fetchIntegrations,
  fetchWebhookSubscriptions,
  revokeApiKey,
  updateIntegration,
} from '@/shared/api/resources';
import type { IntegrationProvider } from '@/shared/types/ecosystem';

type ApiKeyFormState = {
  name: string;
  scopes: string;
};

type WebhookFormState = {
  name: string;
  url: string;
  secret: string;
  events: string;
};

type IntegrationFormsState = Record<string, { status: string; settings: string }>;

const emptyApiKeyForm = (): ApiKeyFormState => ({
  name: '',
  scopes: 'read,write',
});

const emptyWebhookForm = (): WebhookFormState => ({
  name: '',
  url: '',
  secret: '',
  events: 'appointments.created,patients.updated',
});

function normalizeJsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
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

function integrationStatusLabel(status: string) {
  switch (status) {
    case 'configured':
      return 'Preparada';
    case 'active':
      return 'Activa';
    case 'paused':
      return 'En pausa';
    default:
      return 'Sin conectar';
  }
}

export function EcosystemPage() {
  const queryClient = useQueryClient();
  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyFormState>(emptyApiKeyForm);
  const [webhookForm, setWebhookForm] = useState<WebhookFormState>(emptyWebhookForm);
  const [integrationForms, setIntegrationForms] = useState<IntegrationFormsState>({});
  const [integrationErrors, setIntegrationErrors] = useState<Record<string, string>>({});
  const [generatedToken, setGeneratedToken] = useState<string>('');

  const { data: integrations = [] } = useQuery({
    queryKey: ['ecosystem-integrations'],
    queryFn: fetchIntegrations,
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['ecosystem-api-keys'],
    queryFn: fetchApiKeys,
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ['ecosystem-webhooks'],
    queryFn: fetchWebhookSubscriptions,
  });

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }

    setIntegrationForms((previous) => {
      const next = { ...previous };
      integrations.forEach((integration) => {
        if (!next[integration.provider]) {
          next[integration.provider] = {
            status: integration.status,
            settings: normalizeJsonText(integration.settings_json),
          };
        }
      });
      return next;
    });
  }, [integrations]);

  const updateIntegrationMutation = useMutation({
    mutationFn: ({ provider, status, settings }: { provider: string; status: string; settings: Record<string, unknown> }) =>
      updateIntegration(provider, { status, settings_json: settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecosystem-integrations'] });
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ecosystem-api-keys'] });
      setGeneratedToken(data.token || '');
      setApiKeyForm(emptyApiKeyForm());
    },
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecosystem-api-keys'] });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: createWebhookSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecosystem-webhooks'] });
      setWebhookForm(emptyWebhookForm());
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: deleteWebhookSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecosystem-webhooks'] });
    },
  });

  const stats = useMemo(() => {
    return {
      activeIntegrations: integrations.filter((integration) => integration.status === 'active').length,
      configuredIntegrations: integrations.filter((integration) => integration.status !== 'disconnected').length,
      apiKeys: apiKeys.length,
      webhooks: webhooks.filter((webhook) => webhook.is_active).length,
    };
  }, [apiKeys, integrations, webhooks]);

  const openApiUrl = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'}/openapi`;

  const submitIntegration = (provider: IntegrationProvider['provider']) => {
    const form = integrationForms[provider];
    if (!form) {
      return;
    }

    try {
      const settings = form.settings.trim() ? (JSON.parse(form.settings) as Record<string, unknown>) : {};
      setIntegrationErrors((previous) => ({ ...previous, [provider]: '' }));
      updateIntegrationMutation.mutate({ provider, status: form.status, settings });
    } catch {
      setIntegrationErrors((previous) => ({ ...previous, [provider]: 'El JSON de configuracion no es valido' }));
    }
  };

  const handleApiKeySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createApiKeyMutation.mutate({
      name: apiKeyForm.name.trim(),
      scopes_json: apiKeyForm.scopes.split(',').map((scope) => scope.trim()).filter(Boolean),
    });
  };

  const handleWebhookSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createWebhookMutation.mutate({
      name: webhookForm.name.trim(),
      url: webhookForm.url.trim(),
      secret: webhookForm.secret.trim() || null,
      events_json: webhookForm.events.split(',').map((eventName) => eventName.trim()).filter(Boolean),
      is_active: true,
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Conexiones</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Integraciones</h2>
        <p className="mt-2 text-sm text-slate-500">
          Conecta pagos, agenda, marketing y otras herramientas externas desde una sola pantalla.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Activas" value={String(stats.activeIntegrations)} hint="Funcionando hoy" />
        <StatCard label="Preparadas" value={String(stats.configuredIntegrations)} hint="Listas o en pausa" />
        <StatCard label="Claves de acceso" value={String(stats.apiKeys)} hint="Credenciales creadas" />
        <StatCard label="Avisos automaticos" value={String(stats.webhooks)} hint="Conexiones activas" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Acceso para integraciones</h3>
            <p className="mt-1 text-sm text-slate-500">Zona tecnica para herramientas que necesiten conectarse con la clinica.</p>
          </div>
          <a
            href={openApiUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Ver documentacion
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Servicios disponibles</h3>
          <div className="mt-5 space-y-4">
            {integrations.map((integration) => (
              <div key={integration.provider} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{integration.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {integration.category} - ultima actualizacion {formatDateTime(integration.last_sync_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {integrationStatusLabel(integration.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4">
                  <select
                    value={integrationForms[integration.provider]?.status || integration.status}
                    onChange={(event) =>
                      setIntegrationForms((previous) => ({
                        ...previous,
                        [integration.provider]: {
                          status: event.target.value,
                          settings: previous[integration.provider]?.settings ?? normalizeJsonText(integration.settings_json),
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="disconnected">Sin conectar</option>
                    <option value="configured">Preparada</option>
                    <option value="active">Activa</option>
                    <option value="paused">En pausa</option>
                  </select>
                  <textarea
                    value={integrationForms[integration.provider]?.settings || normalizeJsonText(integration.settings_json)}
                    onChange={(event) =>
                      setIntegrationForms((previous) => ({
                        ...previous,
                        [integration.provider]: {
                          status: previous[integration.provider]?.status ?? integration.status,
                          settings: event.target.value,
                        },
                      }))
                    }
                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm"
                  />
                  {integrationErrors[integration.provider] && (
                    <p className="text-sm text-red-600">{integrationErrors[integration.provider]}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => submitIntegration(integration.provider)}
                    disabled={updateIntegrationMutation.isPending}
                    className="justify-self-start rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleApiKeySubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Crear clave de acceso</h3>
            <div className="mt-5 space-y-4">
              <input
                value={apiKeyForm.name}
                onChange={(event) => setApiKeyForm((previous) => ({ ...previous, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="Nombre interno"
              />
              <input
                value={apiKeyForm.scopes}
                onChange={(event) => setApiKeyForm((previous) => ({ ...previous, scopes: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                placeholder="read,write"
              />
            </div>
            <button
              type="submit"
              disabled={createApiKeyMutation.isPending || !apiKeyForm.name.trim()}
              className="mt-5 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              {createApiKeyMutation.isPending ? 'Generando...' : 'Crear clave'}
            </button>
            {generatedToken && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Token generado</p>
                <p className="mt-2 break-all font-mono text-sm text-amber-900">{generatedToken}</p>
              </div>
            )}
          </form>

          <form onSubmit={handleWebhookSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Nuevo aviso automatico</h3>
            <div className="mt-5 space-y-4">
              <input value={webhookForm.name} onChange={(event) => setWebhookForm((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Contabilidad" />
              <input value={webhookForm.url} onChange={(event) => setWebhookForm((previous) => ({ ...previous, url: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="https://..." />
              <input value={webhookForm.secret} onChange={(event) => setWebhookForm((previous) => ({ ...previous, secret: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Clave opcional" />
              <input value={webhookForm.events} onChange={(event) => setWebhookForm((previous) => ({ ...previous, events: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="appointments.created,patients.updated" />
            </div>
            <button
              type="submit"
              disabled={createWebhookMutation.isPending || !webhookForm.name.trim() || !webhookForm.url.trim()}
              className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {createWebhookMutation.isPending ? 'Guardando...' : 'Crear aviso'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Claves de acceso</h3>
          <div className="mt-4 space-y-3">
            {apiKeys.length === 0 && <p className="text-sm text-slate-500">No hay claves emitidas.</p>}
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{apiKey.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {apiKey.scopes_json?.join(', ') || 'read'} - creada {formatDateTime(apiKey.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeApiKeyMutation.mutate(apiKey.id)}
                    disabled={revokeApiKeyMutation.isPending || apiKey.is_active === false}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {apiKey.is_active === false ? 'Revocada' : 'Revocar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Avisos automaticos</h3>
          <div className="mt-4 space-y-3">
            {webhooks.length === 0 && <p className="text-sm text-slate-500">No hay suscripciones creadas.</p>}
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{webhook.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{webhook.url}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {webhook.events_json.join(', ')} - ultimo envio {formatDateTime(webhook.last_triggered_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                    disabled={deleteWebhookMutation.isPending}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Marketplace de integraciones</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add-ons certificados de terceros. Instalacion en un click, modelo revenue-share 70/30.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
            Proximo
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MARKETPLACE_ADDONS.map((addon) => (
            <div
              key={addon.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{addon.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-950">{addon.name}</p>
                    <p className="text-xs text-slate-500">{addon.author}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    addon.available
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {addon.available ? 'Disponible' : 'En desarrollo'}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{addon.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{addon.price}</p>
                <button
                  type="button"
                  disabled={!addon.available}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {addon.available ? 'Instalar' : 'Notificarme'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-700">¿Eres desarrollador?</p>
          <p className="mt-1 text-sm text-slate-500">
            Publica tu integracion en el marketplace y gana el 70% de cada venta.{' '}
            <a href="#" className="font-semibold text-teal-600 hover:underline">
              Ver documentacion de la API
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

const MARKETPLACE_ADDONS = [
  {
    id: 'scanner-3shape',
    name: '3Shape Connector',
    author: 'DentalTech Labs',
    icon: '🦷',
    description: 'Sincroniza escaneos intraorales 3Shape directamente con la ficha del paciente en DentalCRM.',
    price: '29€/mes',
    available: false,
  },
  {
    id: 'lab-connect',
    name: 'LabConnect',
    author: 'LabConnect SL',
    icon: '🔬',
    description: 'Envia pedidos al laboratorio dental desde la agenda y recibe notificaciones de entrega.',
    price: '19€/mes',
    available: false,
  },
  {
    id: 'invisalign-portal',
    name: 'Invisalign Portal',
    author: 'Align Technology',
    icon: '😁',
    description: 'Accede al portal de Invisalign desde DentalCRM, seguimiento de casos y aprobaciones.',
    price: 'Gratuito',
    available: false,
  },
  {
    id: 'sms-marketing',
    name: 'SMS Pro',
    author: 'MobiCom',
    icon: '📱',
    description: 'Envio masivo de SMS con alta entregabilidad y plantillas especializadas para dentistas.',
    price: '0.04€/SMS',
    available: true,
  },
  {
    id: 'whatsapp-oficial',
    name: 'WhatsApp Business API',
    author: 'DentalCRM',
    icon: '💬',
    description: 'Conversaciones de WhatsApp directamente desde el CRM con templates aprobados por Meta.',
    price: '39€/mes',
    available: true,
  },
  {
    id: 'google-reviews',
    name: 'Google Reviews Auto',
    author: 'ReviewBoost',
    icon: '⭐',
    description: 'Solicita resenas de Google automaticamente tras cada visita completada. Aumenta tu puntuacion.',
    price: '15€/mes',
    available: false,
  },
];
