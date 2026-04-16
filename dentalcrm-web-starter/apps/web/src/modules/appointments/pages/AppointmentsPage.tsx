import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Appointment, AppointmentStatus, PatientMini } from '@/shared/types/appointment';
import type { Patient } from '@/shared/types/patient';
import type { Dentist, Treatment } from '@/shared/types/catalog';
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  fetchDentists,
  fetchPatients,
  fetchTreatments,
  updateAppointment,
} from '@/shared/api/resources';

type AppointmentStatusFilter = '' | AppointmentStatus;
type IdFilter = number | '';

type AppointmentForm = {
  patient_id: number;
  dentist_id: number;
  treatment_id: IdFilter;
  treatment_type: string;
  room: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string;
};

const appointmentStatuses: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Realizada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const initialForm: AppointmentForm = {
  patient_id: 0,
  dentist_id: 0,
  treatment_id: '',
  treatment_type: '',
  room: '',
  starts_at: '',
  ends_at: '',
  status: 'confirmed',
  notes: '',
};

function toInputDateTime(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function toApiDateTime(value: string) {
  return new Date(value).toISOString();
}

function toDisplayName(patient: Patient | PatientMini | null | undefined, fallbackId?: number) {
  if (!patient) {
    return fallbackId ? `Paciente ${fallbackId}` : 'Paciente sin asignar';
  }

  return `${patient.first_name} ${patient.last_name}`;
}

function getStatusMeta(status: AppointmentStatus) {
  switch (status) {
    case 'cancelled':
      return { label: 'Cancelada', badgeClass: 'bg-rose-100 text-rose-700' };
    case 'completed':
      return { label: 'Realizada', badgeClass: 'bg-sky-100 text-sky-700' };
    case 'pending':
      return { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-700' };
    default:
      return { label: 'Confirmada', badgeClass: 'bg-emerald-100 text-emerald-700' };
  }
}

function treatmentLabel(id: number | null | undefined, treatments: Treatment[]) {
  if (!id) return '';
  const item = treatments.find((treatment) => treatment.id === id);
  return item ? item.name : '';
}

function dentistLabel(id: number | null | undefined, dentists: Dentist[]) {
  if (!id) return 'Sin asignar';
  return dentists.find((dentist) => dentist.id === id)?.name || 'Sin asignar';
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


function formatTimeRange(start: string, end: string) {
  return `${new Date(start).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${new Date(end).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function isSameDay(value: string, reference: Date) {
  const date = new Date(value);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function getDurationLabel(startsAt: string, endsAt: string) {
  const diffMinutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));

  if (diffMinutes >= 60) {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  return `${diffMinutes} min`;
}

export function AppointmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('');
  const [dentistFilter, setDentistFilter] = useState<IdFilter>('');
  const [treatmentFilter, setTreatmentFilter] = useState<IdFilter>('');
  const [form, setForm] = useState<AppointmentForm>(initialForm);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const queryClient = useQueryClient();

  const {
    data: appointments = [],
    isLoading,
    isError: appointmentsError,
    error: appointmentsRequestError,
  } = useQuery({
    queryKey: ['appointments', { statusFilter, dentistFilter }],
    queryFn: () =>
      fetchAppointments({
        status: statusFilter || undefined,
        dentist_id: dentistFilter || undefined,
      }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  const { data: dentists = [] } = useQuery({
    queryKey: ['dentists'],
    queryFn: fetchDentists,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => fetchTreatments(),
  });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      resetForm();
      setShowForm(false);
      setSelectedEventId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      resetForm();
      setShowForm(false);
      setSelectedEventId(null);
    },
  });

  const visibleAppointments = useMemo(() => {
    if (!treatmentFilter) {
      return appointments;
    }

    return appointments.filter((appointment) => appointment.treatment_id === Number(treatmentFilter));
  }, [appointments, treatmentFilter]);

  const sortedAppointments = useMemo(
    () =>
      [...visibleAppointments].sort(
        (first, second) => new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
      ),
    [visibleAppointments],
  );

  const selectedAppointment = useMemo(
    () => visibleAppointments.find((appointment) => appointment.id === selectedEventId) ?? null,
    [selectedEventId, visibleAppointments],
  );

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    if (!visibleAppointments.some((appointment) => appointment.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [selectedEventId, visibleAppointments]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowForm(false);
        setSelectedEventId(null);
        resetForm();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const isOpen = showForm || selectedEventId !== null;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showForm, selectedEventId]);

  const today = useMemo(() => new Date(), []);

  const todayCount = useMemo(
    () => visibleAppointments.filter((apt) => isSameDay(apt.starts_at, today)).length,
    [visibleAppointments, today],
  );

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    return (
      sortedAppointments.find((apt) => new Date(apt.ends_at).getTime() >= now) ?? null
    );
  }, [sortedAppointments]);

  const pendingCount = visibleAppointments.filter((apt) => apt.status === 'pending').length;
  const confirmedCount = visibleAppointments.filter((apt) => apt.status === 'confirmed').length;
  const completedCount = visibleAppointments.filter((apt) => apt.status === 'completed').length;

  // Días de la semana actual (lunes → domingo)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dow = d.getDay();
    const offset = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - offset);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d);
      day.setDate(d.getDate() + i);
      return day;
    });
  }, [currentDate]);

  // Título del calendario según vista
  const calendarTitle = useMemo(() => {
    if (calendarView === 'month') {
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
    if (calendarView === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}–${end.getDate()} de ${end.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
      }
      return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [calendarView, currentDate, weekDays]);

  // Cuadrícula mensual: 6 semanas × 7 días (lunes como primer día)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Date[] = [];
    for (let i = offset - 1; i >= 0; i--) days.push(new Date(year, month, -i));
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    while (days.length < 42) days.push(new Date(year, month + 1, days.length - offset - daysInMonth + 1));
    return days;
  }, [currentDate]);

  function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  // Índice de citas por día para lookup O(1)
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, typeof visibleAppointments>();
    for (const apt of visibleAppointments) {
      const d = new Date(apt.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    for (const apts of map.values()) {
      apts.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }
    return map;
  }, [visibleAppointments]);

  // Citas del día seleccionado (vista día)
  const currentDayApts = useMemo(
    () => appointmentsByDay.get(dayKey(currentDate)) ?? [],
    [appointmentsByDay, currentDate],
  );

  const canSubmit =
    Number(form.patient_id) > 0 &&
    Number(form.dentist_id) > 0 &&
    form.starts_at.trim() !== '' &&
    form.ends_at.trim() !== '' &&
    new Date(form.ends_at).getTime() > new Date(form.starts_at).getTime();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    (createMutation.error as Error | undefined)?.message ||
    (updateMutation.error as Error | undefined)?.message ||
    (deleteMutation.error as Error | undefined)?.message ||
    '';

  function resetForm() {
    setForm(initialForm);
    setEditingAppointmentId(null);
  }

  function loadFormFromAppointment(appointment: Appointment | null) {
    if (!appointment) return;

    setSelectedEventId(appointment.id);
    setEditingAppointmentId(appointment.id);
    setForm({
      patient_id: appointment.patient_id,
      dentist_id: appointment.dentist_id,
      treatment_id: appointment.treatment_id || '',
      treatment_type: appointment.treatment_type ?? '',
      room: appointment.room ?? '',
      starts_at: toInputDateTime(appointment.starts_at),
      ends_at: toInputDateTime(appointment.ends_at),
      status: appointment.status,
      notes: appointment.notes ?? '',
    });
    setShowForm(true);
  }

  function openCreateForm(startDate?: string, endDate?: string) {
    setSelectedEventId(null);
    setEditingAppointmentId(null);
    setForm((previous) => ({
      ...previous,
      starts_at: startDate ? toInputDateTime(startDate) : '',
      ends_at: endDate ? toInputDateTime(endDate) : '',
      patient_id: 0,
      dentist_id: previous.dentist_id || 0,
      treatment_id: previous.treatment_id || '',
      treatment_type: '',
      room: '',
      status: 'confirmed',
      notes: '',
    }));
    setShowForm(true);
  }

  const submitAppointment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const selectedTreatment = treatments.find((treatment) => treatment.id === Number(form.treatment_id));
    const treatmentType = selectedTreatment ? selectedTreatment.name : form.treatment_type || null;

    const payload = {
      patient_id: Number(form.patient_id),
      dentist_id: Number(form.dentist_id),
      treatment_id: form.treatment_id || null,
      treatment_type: treatmentType || null,
      room: form.room || null,
      status: form.status,
      starts_at: toApiDateTime(form.starts_at),
      ends_at: toApiDateTime(form.ends_at),
      notes: form.notes || null,
    };

    if (editingAppointmentId) {
      updateMutation.mutate({ id: editingAppointmentId, ...payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const renderSidePanel = () => {
    if (showForm) {
      return (
        <form onSubmit={submitAppointment} className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-slate-950">
              {editingAppointmentId ? 'Editar cita' : 'Nueva cita'}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Paciente</span>
            <select
              value={form.patient_id}
              onChange={(event) => setForm((previous) => ({ ...previous, patient_id: Number(event.target.value) }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            >
              <option value={0}>Selecciona un paciente</option>
              {patients.map((patient) => (
                <option value={patient.id} key={patient.id}>{patient.first_name} {patient.last_name}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Profesional</span>
              <select
                value={form.dentist_id}
                onChange={(event) => setForm((previous) => ({ ...previous, dentist_id: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              >
                <option value={0}>Selecciona</option>
                {dentists.map((dentist: Dentist) => (
                  <option value={dentist.id} key={dentist.id}>{dentist.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Estado</span>
              <select
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value as AppointmentStatus }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {appointmentStatuses.map((status) => (
                  <option value={status.value} key={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Tratamiento</span>
              <select
                value={form.treatment_id}
                onChange={(event) => setForm((previous) => ({ ...previous, treatment_id: Number(event.target.value) || '' }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Sin definir</option>
                {treatments.map((treatment: Treatment) => (
                  <option value={treatment.id} key={treatment.id}>{treatment.name} ({treatment.duration_minutes} min)</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Sala</span>
              <input
                value={form.room}
                onChange={(event) => setForm((previous) => ({ ...previous, room: event.target.value }))}
                placeholder="Ej. Sala 1"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Inicio</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => setForm((previous) => ({ ...previous, starts_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Fin</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => setForm((previous) => ({ ...previous, ends_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">Notas</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Ej. llamar antes, confirmar presupuesto..."
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className="rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300"
            >
              {isSaving ? 'Guardando...' : editingAppointmentId ? 'Guardar cambios' : 'Crear cita'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            {editingAppointmentId && selectedAppointment && (
              <button
                type="button"
                onClick={() => deleteMutation.mutate(editingAppointmentId)}
                disabled={deleteMutation.isPending}
                className="ml-auto rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            )}
          </div>

          {mutationError && <p className="text-sm text-rose-600">{mutationError}</p>}
        </form>
      );
    }

    if (selectedAppointment) {
      const statusMeta = getStatusMeta(selectedAppointment.status);
      const treatmentName =
        selectedAppointment.treatment_type ||
        selectedAppointment.treatment?.name ||
        treatmentLabel(selectedAppointment.treatment_id, treatments) ||
        'Cita general';

      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {toDisplayName(selectedAppointment.patient, selectedAppointment.patient_id)}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{treatmentName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadFormFromAppointment(selectedAppointment)}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => { setSelectedEventId(null); resetForm(); }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Horario</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(selectedAppointment.starts_at)}</p>
              <p className="text-xs text-slate-500">{formatTimeRange(selectedAppointment.starts_at, selectedAppointment.ends_at)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Duracion</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{getDurationLabel(selectedAppointment.starts_at, selectedAppointment.ends_at)}</p>
              <p className="text-xs text-slate-500">{selectedAppointment.room ? `Sala ${selectedAppointment.room}` : 'Sala pendiente'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Profesional</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedAppointment.dentist?.name || dentistLabel(selectedAppointment.dentist_id, dentists)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cobro</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedAppointment.invoice?.number || 'Sin factura'}
              </p>
              <p className="text-xs text-slate-500">
                {selectedAppointment.invoice
                  ? selectedAppointment.invoice.paid_cents >= selectedAppointment.invoice.total_cents ? 'Pagada' : 'Pendiente'
                  : 'Se genera mas tarde'}
              </p>
            </div>
          </div>

          {selectedAppointment.notes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Notas</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{selectedAppointment.notes}</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {nextAppointment && (
          <div className="rounded-[1.25rem] border border-[var(--color-brand-soft)] bg-[var(--color-brand-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">Siguiente cita</p>
            <p className="mt-2 font-semibold text-slate-950">
              {toDisplayName(nextAppointment.patient, nextAppointment.patient_id)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {nextAppointment.treatment_type || nextAppointment.treatment?.name || 'Cita general'}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--color-brand)]">
              {formatTimeRange(nextAppointment.starts_at, nextAppointment.ends_at)}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acciones</p>
          <h3 className="mt-2 text-xl text-slate-950">Selecciona o crea una cita</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Haz clic en una cita del calendario o de la lista para ver sus datos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateForm()}
          className="rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Nueva cita
        </button>
      </div>
    );
  };

  return (
    <section className="space-y-5">

      {/* Calendario — todo integrado en una sola tarjeta */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white">

        {/* Cabecera: título + stats + nueva cita */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Agenda</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-500">Hoy <strong className="text-slate-800">{todayCount}</strong></span>
              <span className="text-slate-200">|</span>
              <span className="text-emerald-600"><strong>{confirmedCount}</strong> confirmadas</span>
              <span className="text-slate-200">|</span>
              <span className="text-amber-500"><strong>{pendingCount}</strong> pendientes</span>
              <span className="text-slate-200">|</span>
              <span className="text-sky-500"><strong>{completedCount}</strong> realizadas</span>
              {nextAppointment && (
                <>
                  <span className="text-slate-200">|</span>
                  <span className="text-slate-400 text-xs">Siguiente: {formatTimeRange(nextAppointment.starts_at, nextAppointment.ends_at)}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCreateForm()}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Nueva cita
          </button>
        </div>

        {/* Toolbar: navegación + selector de vista + filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40 px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentDate((d) => {
                const n = new Date(d);
                if (calendarView === 'month') n.setMonth(n.getMonth() - 1);
                else if (calendarView === 'week') n.setDate(n.getDate() - 7);
                else n.setDate(n.getDate() - 1);
                return n;
              })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100"
            >
              ‹
            </button>
            <h3 className="min-w-[200px] text-center text-sm font-semibold capitalize text-slate-800">
              {calendarTitle}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentDate((d) => {
                const n = new Date(d);
                if (calendarView === 'month') n.setMonth(n.getMonth() + 1);
                else if (calendarView === 'week') n.setDate(n.getDate() + 7);
                else n.setDate(n.getDate() + 1);
                return n;
              })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Hoy
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros */}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatusFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
              <option value="">Todos los estados</option>
              {appointmentStatuses.map((s) => <option value={s.value} key={s.value}>{s.label}</option>)}
            </select>
            <select value={dentistFilter} onChange={(e) => setDentistFilter(Number(e.target.value) || '')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
              <option value="">Todo el equipo</option>
              {dentists.map((d: Dentist) => <option value={d.id} key={d.id}>{d.name}</option>)}
            </select>
            <select value={treatmentFilter} onChange={(e) => setTreatmentFilter(Number(e.target.value) || '')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
              <option value="">Tratamiento</option>
              {treatments.map((t: Treatment) => <option value={t.id} key={t.id}>{t.name}</option>)}
            </select>
            {(statusFilter || dentistFilter || treatmentFilter) && (
              <button type="button" onClick={() => { setStatusFilter(''); setDentistFilter(''); setTreatmentFilter(''); }}
                className="text-xs text-slate-400 hover:text-slate-700">✕</button>
            )}

            {/* Selector de vista */}
            <div className="ml-1 flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setCalendarView(v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    calendarView === v ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Estados de carga / error */}
        {isLoading && (
          <div className="flex items-center gap-3 px-6 py-5 text-sm text-slate-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
            Cargando agenda...
          </div>
        )}
        {appointmentsError && (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {(appointmentsRequestError as Error | undefined)?.message || 'No fue posible cargar las citas'}
          </div>
        )}

        {/* ── VISTA MES ── */}
        {!isLoading && calendarView === 'month' && (
          <>
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = isSameDay(day.toISOString(), today);
                const dayApts = appointmentsByDay.get(dayKey(day)) ?? [];
                const visible = dayApts.slice(0, 3);
                const overflow = dayApts.length - visible.length;
                return (
                  <div
                    key={i}
                    onClick={() => { const s = new Date(day); s.setHours(9,0,0,0); const e = new Date(day); e.setHours(9,30,0,0); openCreateForm(s.toISOString(), e.toISOString()); }}
                    className={`min-h-[110px] cursor-pointer border-b border-r border-slate-100 p-2 transition hover:bg-slate-50/70 ${!isCurrentMonth ? 'bg-slate-50/40' : ''} ${i % 7 === 6 ? 'border-r-0' : ''}`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-[var(--color-brand)] text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {visible.map((apt) => (
                        <button key={apt.id} type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedEventId(apt.id); setShowForm(false); }}
                          className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight ${
                            apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                            apt.status === 'pending'   ? 'bg-amber-50 text-amber-700' :
                            apt.status === 'completed' ? 'bg-sky-50 text-sky-700' :
                                                         'bg-rose-50 text-rose-600'}`}>
                          <span className="shrink-0 font-semibold">{new Date(apt.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="truncate">{toDisplayName(apt.patient, apt.patient_id)}</span>
                        </button>
                      ))}
                      {overflow > 0 && <p className="px-1 text-[11px] text-slate-400">+{overflow} más</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── VISTA SEMANA ── */}
        {!isLoading && calendarView === 'week' && (
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day.toISOString(), today);
              const dayApts = appointmentsByDay.get(dayKey(day)) ?? [];
              return (
                <div key={i}>
                  <div
                    className={`border-b border-slate-100 py-3 text-center ${isToday ? 'bg-teal-50/60' : ''}`}
                    onClick={() => { const s = new Date(day); s.setHours(9,0,0,0); const e = new Date(day); e.setHours(9,30,0,0); openCreateForm(s.toISOString(), e.toISOString()); }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </p>
                    <span className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-[var(--color-brand)] text-white' : 'text-slate-700'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="min-h-[480px] space-y-1.5 p-2">
                    {dayApts.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => { const s = new Date(day); s.setHours(9,0,0,0); const e = new Date(day); e.setHours(9,30,0,0); openCreateForm(s.toISOString(), e.toISOString()); }}
                        className="w-full rounded-lg border-2 border-dashed border-slate-100 py-6 text-xs text-slate-300 transition hover:border-slate-200 hover:text-slate-400"
                      >
                        +
                      </button>
                    ) : (
                      dayApts.map((apt) => (
                        <button key={apt.id} type="button"
                          onClick={() => { setSelectedEventId(apt.id); setShowForm(false); }}
                          className={`w-full rounded-xl border p-2 text-left text-xs transition hover:shadow-sm ${
                            apt.status === 'confirmed' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' :
                            apt.status === 'pending'   ? 'border-amber-100 bg-amber-50 text-amber-800' :
                            apt.status === 'completed' ? 'border-sky-100 bg-sky-50 text-sky-800' :
                                                         'border-rose-100 bg-rose-50 text-rose-700'}`}>
                          <p className="font-semibold">{new Date(apt.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="mt-0.5 truncate font-medium">{toDisplayName(apt.patient, apt.patient_id)}</p>
                          <p className="truncate opacity-70">{apt.treatment_type || apt.treatment?.name || 'Cita'}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── VISTA DÍA ── */}
        {!isLoading && calendarView === 'day' && (
          <div className="px-6 py-5">
            {currentDayApts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-3xl text-slate-200">○</p>
                <p className="mt-4 font-medium text-slate-400">Sin citas para este día</p>
                <button
                  type="button"
                  onClick={() => { const s = new Date(currentDate); s.setHours(9,0,0,0); const e = new Date(currentDate); e.setHours(9,30,0,0); openCreateForm(s.toISOString(), e.toISOString()); }}
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                >
                  + Nueva cita
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-w-2xl mx-auto">
                {currentDayApts.map((apt) => {
                  const statusMeta = getStatusMeta(apt.status);
                  const treatmentName = apt.treatment_type || apt.treatment?.name || treatmentLabel(apt.treatment_id, treatments) || 'Cita general';
                  return (
                    <button key={apt.id} type="button"
                      onClick={() => { setSelectedEventId(apt.id); setShowForm(false); }}
                      className="w-full flex items-center gap-5 rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-slate-200 hover:shadow-sm">
                      <div className="w-14 shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-800">{new Date(apt.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[11px] text-slate-400">{getDurationLabel(apt.starts_at, apt.ends_at)}</p>
                      </div>
                      <div className="h-8 w-px shrink-0 bg-slate-100" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{toDisplayName(apt.patient, apt.patient_id)}</p>
                        <p className="text-sm text-slate-500 truncate">{treatmentName}</p>
                        <p className="text-xs text-slate-400">{apt.dentist?.name || dentistLabel(apt.dentist_id, dentists)}{apt.room ? ` · Sala ${apt.room}` : ''}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {(showForm || selectedEventId !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => {
              setShowForm(false);
              setSelectedEventId(null);
              resetForm();
            }}
          />
          <div className="relative z-10 w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl">
            {renderSidePanel()}
          </div>
        </div>
      )}
    </section>
  );
}
