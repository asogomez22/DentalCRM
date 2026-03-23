import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  cancelTelemedicineSession,
  createTelemedicineSession,
  endTelemedicineSession,
  fetchPatients,
  fetchTelemedicineSessions,
  fetchUsers,
  startTelemedicineSession,
} from '@/shared/api/resources';
import type { TelemedicineSession } from '@/shared/types/telemedicine';

const STATUS_LABELS: Record<TelemedicineSession['status'], string> = {
  scheduled:   'Programada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
};

const STATUS_COLORS: Record<TelemedicineSession['status'], string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-slate-100 text-slate-500',
};

const PROVIDER_LABELS: Record<string, string> = {
  jitsi:   'Jitsi Meet (gratuito)',
  whereby: 'Whereby',
  zoom:    'Zoom',
};

type SessionForm = {
  patient_id: string;
  dentist_id: string;
  scheduled_at: string;
  provider: 'jitsi' | 'whereby' | 'zoom';
  notes: string;
};

const emptyForm = (): SessionForm => ({
  patient_id:   '',
  dentist_id:   '',
  scheduled_at: '',
  provider:     'jitsi',
  notes:        '',
});

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export function TelemedicinePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SessionForm>(emptyForm());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [endingSession, setEndingSession] = useState<TelemedicineSession | null>(null);
  const [endNotes, setEndNotes] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['telemedicine', statusFilter],
    queryFn: () => fetchTelemedicineSessions(statusFilter ? { status: statusFilter } : undefined),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'telemedicine'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 120_000,
  });

  const createMutation = useMutation({
    mutationFn: createTelemedicineSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine'] });
      setForm(emptyForm());
    },
  });

  const startMutation = useMutation({
    mutationFn: startTelemedicineSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telemedicine'] }),
  });

  const endMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) => endTelemedicineSession(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telemedicine'] });
      setEndingSession(null);
      setEndNotes('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTelemedicineSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telemedicine'] }),
  });

  const stats = useMemo(() => {
    const scheduled  = sessions.filter((s) => s.status === 'scheduled').length;
    const inProgress = sessions.filter((s) => s.status === 'in_progress').length;
    const completed  = sessions.filter((s) => s.status === 'completed').length;
    const avgDuration = (() => {
      const withDuration = sessions.filter((s) => s.duration_minutes != null);
      if (!withDuration.length) return 0;
      return Math.round(withDuration.reduce((s, x) => s + (x.duration_minutes ?? 0), 0) / withDuration.length);
    })();
    return { scheduled, inProgress, completed, avgDuration };
  }, [sessions]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.dentist_id || !form.scheduled_at) return;

    createMutation.mutate({
      patient_id:   Number(form.patient_id),
      dentist_id:   Number(form.dentist_id),
      scheduled_at: form.scheduled_at,
      provider:     form.provider,
      notes:        form.notes || null,
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Consultas</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Telemedicina</h2>
        <p className="mt-2 text-sm text-slate-500">
          Videoconsultas con pacientes sin desplazamiento. Programadas, en curso y completadas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Programadas" value={String(stats.scheduled)} hint="Pendientes de realizar" />
        <StatCard label="En curso" value={String(stats.inProgress)} hint="Sesiones activas ahora" />
        <StatCard label="Completadas" value={String(stats.completed)} hint="Total realizadas" />
        <StatCard label="Duracion media" value={stats.avgDuration ? `${stats.avgDuration} min` : '-'} hint="Promedio de sesiones" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Schedule form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Programar videoconsulta</h3>
          <p className="mt-1 text-sm text-slate-500">
            El paciente recibira un enlace de acceso automaticamente.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Paciente</span>
              <select
                value={form.patient_id}
                onChange={(e) => setForm((p) => ({ ...p, patient_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              >
                <option value="">Selecciona paciente</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Dentista</span>
              <select
                value={form.dentist_id}
                onChange={(e) => setForm((p) => ({ ...p, dentist_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              >
                <option value="">Selecciona dentista</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Fecha y hora</span>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Plataforma</span>
              <select
                value={form.provider}
                onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value as SessionForm['provider'] }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm text-slate-600">Notas previas</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              placeholder="Motivo de la consulta, preparacion previa..."
            />
          </label>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            {createMutation.isPending ? 'Programando...' : 'Programar consulta'}
          </button>

          {createMutation.isError && (
            <p className="mt-3 text-sm text-red-600">No se pudo crear la sesion.</p>
          )}

          {/* Info box */}
          <div className="mt-5 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">Como funciona</p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>1. Se genera un enlace unico de sala privada</li>
              <li>2. Se envia automaticamente al paciente por email</li>
              <li>3. El dentista inicia la sesion desde aqui</li>
              <li>4. Al terminar se registran notas y duracion</li>
            </ul>
          </div>
        </form>

        {/* Sessions list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950">Sesiones</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Cargando sesiones...</p>}
            {!isLoading && sessions.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <p className="text-4xl">📹</p>
                <p className="mt-3 text-sm font-semibold text-slate-700">Sin videoconsultas</p>
                <p className="mt-1 text-sm text-slate-500">Programa la primera consulta virtual.</p>
              </div>
            )}

            {sessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200 p-4 hover:border-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {session.patient
                        ? `${session.patient.first_name} ${session.patient.last_name}`
                        : 'Paciente'}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {session.dentist?.name ?? 'Dentista'} · {PROVIDER_LABELS[session.provider] ?? session.provider}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDateTime(session.scheduled_at)}
                    </p>
                    {session.duration_minutes != null && (
                      <p className="mt-1 text-xs text-slate-400">
                        Duracion: {formatDuration(session.duration_minutes)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[session.status]}`}>
                      {STATUS_LABELS[session.status]}
                    </span>

                    <div className="flex flex-wrap justify-end gap-1.5">
                      {session.status === 'scheduled' && (
                        <>
                          <a
                            href={session.room_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                          >
                            Abrir sala
                          </a>
                          <button
                            onClick={() => startMutation.mutate(session.id)}
                            disabled={startMutation.isPending}
                            className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            Iniciar
                          </button>
                          <button
                            onClick={() => cancelMutation.mutate(session.id)}
                            disabled={cancelMutation.isPending}
                            className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-rose-600"
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {session.status === 'in_progress' && (
                        <>
                          <a
                            href={session.room_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                          >
                            Unirse
                          </a>
                          <button
                            onClick={() => setEndingSession(session)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Finalizar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {session.notes && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{session.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* End session modal */}
      {endingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-950">Finalizar sesion</h3>
            <p className="mt-1 text-sm text-slate-500">
              Paciente: {endingSession.patient?.first_name} {endingSession.patient?.last_name}
            </p>

            <label className="mt-4 block space-y-2">
              <span className="text-sm text-slate-600">Notas de la sesion</span>
              <textarea
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Resumen de lo tratado en la consulta..."
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => endMutation.mutate({ id: endingSession.id, notes: endNotes })}
                disabled={endMutation.isPending}
                className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
              >
                {endMutation.isPending ? 'Guardando...' : 'Finalizar y guardar'}
              </button>
              <button
                onClick={() => { setEndingSession(null); setEndNotes(''); }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
