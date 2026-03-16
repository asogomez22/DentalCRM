import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  createStaffSchedule,
  deleteStaffSchedule,
  fetchStaffSchedules,
  fetchUsers,
} from '@/shared/api/resources';
import type { StaffScheduleCreatePayload } from '@/shared/types/staff';

const weekdays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' },
  { value: 0, label: 'Domingo' },
] as const;

type ScheduleFormState = {
  user_id: string;
  weekday: string;
  start_time: string;
  end_time: string;
  location: string;
  is_available: boolean;
};

const defaultForm = (): ScheduleFormState => ({
  user_id: '',
  weekday: '1',
  start_time: '09:00',
  end_time: '14:00',
  location: '',
  is_available: true,
});

function weekdayLabel(value: number) {
  return weekdays.find((day) => day.value === value)?.label ?? `Dia ${value}`;
}

function roleLabel(role?: string | null) {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'dentist':
      return 'Dentista';
    case 'assistant':
      return 'Auxiliar';
    case 'reception':
      return 'Recepcion';
    default:
      return 'Equipo';
  }
}

export function StaffPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ScheduleFormState>(defaultForm);
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const {
    data: schedules = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['staff-schedules', selectedUserId],
    queryFn: () =>
      fetchStaffSchedules({
        user_id: selectedUserId ? Number(selectedUserId) : undefined,
      }),
  });

  useEffect(() => {
    if (form.user_id || users.length === 0) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      user_id: String(users[0].id),
    }));
  }, [form.user_id, users]);

  const createMutation = useMutation({
    mutationFn: createStaffSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
      setForm((previous) => ({
        ...defaultForm(),
        user_id: previous.user_id || '',
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaffSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
    },
  });

  const stats = useMemo(() => {
    const available = schedules.filter((schedule) => schedule.is_available).length;
    const uniqueUsers = new Set(schedules.map((schedule) => schedule.user_id)).size;
    const locations = new Set(
      schedules
        .map((schedule) => schedule.location?.trim())
        .filter((value): value is string => Boolean(value)),
    ).size;

    return {
      staffCount: users.length,
      blocks: schedules.length,
      available,
      locations,
      coveredUsers: uniqueUsers,
    };
  }, [schedules, users]);

  const canSubmit =
    Number(form.user_id) > 0 &&
    Number.isInteger(Number(form.weekday)) &&
    form.start_time.length > 0 &&
    form.end_time.length > 0 &&
    form.end_time > form.start_time;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const payload: StaffScheduleCreatePayload = {
      user_id: Number(form.user_id),
      weekday: Number(form.weekday),
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location.trim() || null,
      is_available: form.is_available,
    };

    createMutation.mutate(payload);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700">Operaciones</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Equipo</h2>
        <p className="mt-2 text-sm text-slate-500">
          Organiza la disponibilidad del equipo por dia, centro y franja horaria.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios activos" value={String(stats.staffCount)} hint="Equipo disponible en la clinica" />
        <StatCard label="Bloques horarios" value={String(stats.blocks)} hint="Tramos configurados" />
        <StatCard label="Bloques activos" value={String(stats.available)} hint="Marcados como disponibles" />
        <StatCard label="Ubicaciones" value={String(stats.locations)} hint={`${stats.coveredUsers} personas con horario`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Nuevo bloque de horario</h3>
          <p className="mt-1 text-sm text-slate-500">Marca cuando trabaja cada persona y en que ubicacion.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Profesional</span>
              <select
                value={form.user_id}
                onChange={(event) => setForm((previous) => ({ ...previous, user_id: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Selecciona usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {roleLabel(user.role)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Dia</span>
              <select
                value={form.weekday}
                onChange={(event) => setForm((previous) => ({ ...previous, weekday: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {weekdays.map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>
                    {weekday.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Ubicacion</span>
              <input
                value={form.location}
                onChange={(event) => setForm((previous) => ({ ...previous, location: event.target.value }))}
                placeholder="Gabinete 1, sede centro..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Hora inicio</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(event) => setForm((previous) => ({ ...previous, start_time: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Hora fin</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(event) => setForm((previous) => ({ ...previous, end_time: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="flex items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) => setForm((previous) => ({ ...previous, is_available: event.target.checked }))}
              />
              <span className="text-sm text-slate-600">Bloque disponible para reservas internas</span>
            </label>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              className="rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              {createMutation.isPending ? 'Guardando...' : 'Guardar horario'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              {(createMutation.error as Error | undefined)?.message || 'No se pudo guardar el horario'}
            </p>
          )}
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Agenda base del equipo</h3>
              <p className="mt-1 text-sm text-slate-500">Consulta los horarios guardados de cada profesional.</p>
            </div>

            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            >
              <option value="">Todo el equipo</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Cargando horarios...</p>}
            {isError && (
              <p className="text-sm text-red-600">
                {(error as Error | undefined)?.message || 'No se pudieron cargar los horarios'}
              </p>
            )}
            {!isLoading && !isError && schedules.length === 0 && (
              <p className="text-sm text-slate-500">Todavia no hay bloques horarios configurados.</p>
            )}

            {schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{schedule.user?.name || `Profesional ${schedule.user_id}`}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {weekdayLabel(schedule.weekday)} - {schedule.start_time.slice(0, 5)} a {schedule.end_time.slice(0, 5)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{schedule.location || 'Sin ubicacion especifica'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        schedule.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {schedule.is_available ? 'Disponible' : 'Bloqueado'}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(schedule.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
