import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClinicSettings } from '@/shared/types/appointment';
import { fetchClinicSettings, updateClinicSettings } from '@/shared/api/resources';

const defaultSettings: ClinicSettings = {
  brand_name: 'Clinica Demo',
  primary_color: '#0f766e',
  secondary_color: '#0f172a',
  logo_url: '',
  public_phone: '',
  public_email: '',
  booking_enabled: true,
  settings_json: {
    website: {
      hero_title: 'Clinica Demo',
      hero_copy: 'Pide cita, revisa tus documentos y accede a tu area privada desde la misma web de la clinica.',
    },
  },
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClinicSettings>(defaultSettings);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: fetchClinicSettings,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: updateClinicSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic-settings'] }),
  });

  useEffect(() => {
    if (data) {
      setForm({
        brand_name: data.brand_name || defaultSettings.brand_name,
        primary_color: data.primary_color || defaultSettings.primary_color,
        secondary_color: data.secondary_color || defaultSettings.secondary_color,
        logo_url: data.logo_url || '',
        public_phone: data.public_phone || '',
        public_email: data.public_email || '',
        booking_enabled: data.booking_enabled ?? true,
        settings_json: {
          website: {
            hero_title: data.settings_json?.website?.hero_title || data.brand_name || defaultSettings.brand_name,
            hero_copy:
              data.settings_json?.website?.hero_copy ||
              defaultSettings.settings_json?.website?.hero_copy ||
              '',
          },
        },
      });
    }
  }, [data]);

  const previewStyle: CSSProperties = {
    ['--preview-primary' as string]: form.primary_color,
    ['--preview-secondary' as string]: form.secondary_color,
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateMutation.mutate({
      brand_name: form.brand_name,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      logo_url: form.logo_url || null,
      public_phone: form.public_phone || null,
      public_email: form.public_email || null,
      booking_enabled: form.booking_enabled,
      settings_json: form.settings_json || null,
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">White-label</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Clinica</h2>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando configuracion...</p>}

      {isError && <p className="text-sm text-red-600">{(error as Error | undefined)?.message || 'No fue posible cargar la configuracion'}</p>}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Configuracion visual</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Nombre comercial</span>
              <input
                value={form.brand_name}
                onChange={(event) => setForm((previous) => ({ ...previous, brand_name: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Color principal</span>
              <input
                type="color"
                value={form.primary_color}
                onChange={(event) => setForm((previous) => ({ ...previous, primary_color: event.target.value }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-1"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Color secundario</span>
              <input
                type="color"
                value={form.secondary_color}
                onChange={(event) => setForm((previous) => ({ ...previous, secondary_color: event.target.value }))}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-1"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Logo URL</span>
              <input
                value={form.logo_url ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, logo_url: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Telefono public</span>
              <input
                value={form.public_phone ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, public_phone: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Email public</span>
              <input
                type="email"
                value={form.public_email ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, public_email: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.booking_enabled ?? true}
                onChange={(event) => setForm((previous) => ({ ...previous, booking_enabled: event.target.checked }))}
              />
              <span className="text-sm text-slate-600">Reservas publicas habilitadas</span>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Titulo principal de la web</span>
              <input
                value={form.settings_json?.website?.hero_title || ''}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    settings_json: {
                      ...previous.settings_json,
                      website: {
                        ...previous.settings_json?.website,
                        hero_title: event.target.value,
                      },
                    },
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Texto principal de la web</span>
              <textarea
                value={form.settings_json?.website?.hero_copy || ''}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    settings_json: {
                      ...previous.settings_json,
                      website: {
                        ...previous.settings_json?.website,
                        hero_copy: event.target.value,
                      },
                    },
                  }))
                }
                className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {updateMutation.isError && (
              <p className="mt-2 text-sm text-red-600">
                {(updateMutation.error as Error | undefined)?.message || 'No se pudo guardar la configuracion'}
              </p>
            )}
            {updateMutation.isSuccess && <p className="mt-2 text-sm text-teal-700">Configuracion guardada.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Vista previa</h3>
          <div
            className="mt-5 rounded-2xl bg-slate-950 p-6 text-white"
            style={previewStyle as CSSProperties}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-xl"
                style={{ background: form.primary_color || '#0f766e' }}
              />
              <div>
                <p className="text-lg font-semibold" style={{ color: form.secondary_color || '#ffffff' }}>
                  {form.settings_json?.website?.hero_title || form.brand_name || 'Clinica Demo'}
                </p>
                <p className="text-sm text-slate-300">
                  {form.settings_json?.website?.hero_copy || 'Reserva online y area privada del paciente'}
                </p>
                <p className="text-sm text-slate-300">{form.public_email || 'contacto@clinica.example'}</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
