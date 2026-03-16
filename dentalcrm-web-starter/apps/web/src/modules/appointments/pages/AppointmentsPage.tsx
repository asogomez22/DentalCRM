import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
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

function formatDay(value: Date) {
  return value.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('');
  const [dentistFilter, setDentistFilter] = useState<IdFilter>('');
  const [treatmentFilter, setTreatmentFilter] = useState<IdFilter>('');
  const [form, setForm] = useState<AppointmentForm>(initialForm);

  const queryClient = useQueryClient();

  const {
    data: appointments = [],
    isLoading,
    isError: appointmentsError,
    error: appointmentsRequestError,
  } = useQuery({
    queryKey: ['appointments', { dateFilter, statusFilter, dentistFilter }],
    queryFn: () =>
      fetchAppointments({
        date: dateFilter || undefined,
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

  const events = useMemo(
    () =>
      visibleAppointments.map((appointment: Appointment) => {
        const treatmentName =
          appointment.treatment_type ||
          appointment.treatment?.name ||
          treatmentLabel(appointment.treatment_id, treatments) ||
          'Cita general';

        return {
          id: String(appointment.id),
          title: toDisplayName(appointment.patient, appointment.patient_id),
          start: appointment.starts_at,
          end: appointment.ends_at,
          classNames: ['calendar-appointment', `calendar-appointment--${appointment.status}`],
          extendedProps: {
            patientName: toDisplayName(appointment.patient, appointment.patient_id),
            treatmentName,
            dentistName: appointment.dentist?.name || dentistLabel(appointment.dentist_id, dentists),
            room: appointment.room || 'Sin sala',
          },
        };
      }),
    [dentists, treatments, visibleAppointments],
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

  const referenceDate = useMemo(() => {
    if (!dateFilter) {
      return new Date();
    }

    return new Date(`${dateFilter}T12:00:00`);
  }, [dateFilter]);

  const appointmentsForReferenceDay = useMemo(
    () => sortedAppointments.filter((appointment) => isSameDay(appointment.starts_at, referenceDate)),
    [referenceDate, sortedAppointments],
  );

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return sortedAppointments.filter((appointment) => new Date(appointment.ends_at).getTime() >= now).slice(0, 6);
  }, [sortedAppointments]);

  const nextAppointment = upcomingAppointments[0] ?? null;
  const pendingCount = visibleAppointments.filter((appointment) => appointment.status === 'pending').length;
  const confirmedCount = visibleAppointments.filter((appointment) => appointment.status === 'confirmed').length;
  const completedCount = visibleAppointments.filter((appointment) => appointment.status === 'completed').length;

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

  const renderEventContent = (info: EventContentArg) => (
    <div className="calendar-appointment__content">
      <p className="calendar-appointment__time">{info.timeText || 'Hora'}</p>
      <p className="calendar-appointment__title">{String(info.event.extendedProps.patientName || info.event.title)}</p>
      <p className="calendar-appointment__meta">{String(info.event.extendedProps.treatmentName || 'Cita')}</p>
    </div>
  );

  const renderSidePanel = () => {
    if (showForm) {
      return (
        <form onSubmit={submitAppointment} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {editingAppointmentId ? 'Edicion' : 'Nueva cita'}
              </p>
              <h3 className="mt-2 text-2xl text-slate-950">
                {editingAppointmentId ? 'Actualizar cita' : 'Reservar un hueco'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Rellena solo lo importante. El resto puede completarse mas tarde.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-[1rem] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Cerrar
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-600">Paciente</span>
              <select
                value={form.patient_id}
                onChange={(event) => setForm((previous) => ({ ...previous, patient_id: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              >
                <option value={0}>Selecciona un paciente</option>
                {patients.map((patient) => (
                  <option value={patient.id} key={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Profesional</span>
              <select
                value={form.dentist_id}
                onChange={(event) => setForm((previous) => ({ ...previous, dentist_id: Number(event.target.value) }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              >
                <option value={0}>Selecciona un profesional</option>
                {dentists.map((dentist: Dentist) => (
                  <option value={dentist.id} key={dentist.id}>
                    {dentist.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Estado</span>
              <select
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value as AppointmentStatus }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {appointmentStatuses.map((status) => (
                  <option value={status.value} key={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Tratamiento</span>
              <select
                value={form.treatment_id}
                onChange={(event) => setForm((previous) => ({ ...previous, treatment_id: Number(event.target.value) || '' }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Sin definir</option>
                {treatments.map((treatment: Treatment) => (
                  <option value={treatment.id} key={treatment.id}>
                    {treatment.name} ({treatment.duration_minutes} min)
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Sala</span>
              <input
                value={form.room}
                onChange={(event) => setForm((previous) => ({ ...previous, room: event.target.value }))}
                placeholder="Ej. Sala 1"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Inicio</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => setForm((previous) => ({ ...previous, starts_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Fin</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => setForm((previous) => ({ ...previous, ends_at: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                required
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-slate-600">Notas para el equipo</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
              className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              placeholder="Ej. llamar antes, confirmar presupuesto, preparar radiografia..."
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className="rounded-[1rem] bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              {isSaving ? 'Guardando...' : editingAppointmentId ? 'Guardar cambios' : 'Guardar cita'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              Cancelar
            </button>
            {editingAppointmentId && selectedAppointment ? (
              <button
                type="button"
                onClick={() => deleteMutation.mutate(editingAppointmentId)}
                disabled={deleteMutation.isPending}
                className="rounded-[1rem] bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:bg-rose-300"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar cita'}
              </button>
            ) : null}
          </div>

          {mutationError ? <p className="text-sm text-rose-700">{mutationError}</p> : null}
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
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <h3 className="mt-3 text-2xl text-slate-950">
                {toDisplayName(selectedAppointment.patient, selectedAppointment.patient_id)}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{treatmentName}</p>
            </div>
            <button
              type="button"
              onClick={() => loadFormFromAppointment(selectedAppointment)}
              className="rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Editar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Horario</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(selectedAppointment.starts_at)}</p>
              <p className="mt-1 text-sm text-slate-600">
                {formatTimeRange(selectedAppointment.starts_at, selectedAppointment.ends_at)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Duracion</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {getDurationLabel(selectedAppointment.starts_at, selectedAppointment.ends_at)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedAppointment.room ? `Sala ${selectedAppointment.room}` : 'Sala pendiente'}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Profesional</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {selectedAppointment.dentist?.name || dentistLabel(selectedAppointment.dentist_id, dentists)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cobro</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {selectedAppointment.invoice?.number || 'Sin factura asociada'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedAppointment.invoice
                  ? selectedAppointment.invoice.paid_cents >= selectedAppointment.invoice.total_cents
                    ? 'Pagada'
                    : 'Pendiente de cobro'
                  : 'Se puede generar mas tarde'}
              </p>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-slate-200 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notas</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {selectedAppointment.notes || 'No hay notas internas para esta cita.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acciones</p>
          <h3 className="mt-2 text-2xl text-slate-950">Selecciona una cita o crea una nueva</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Haz clic en una cita para ver sus datos o arrastra en el calendario para reservar un horario.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateForm()}
          className="rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Crear cita manual
        </button>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="panel page-hero rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="pill pill-strong">Agenda del equipo</span>
            <h2 className="mt-4 text-4xl text-slate-950 md:text-[3.2rem]">Citas y turnos</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Revisa la semana, abre una cita y haz cambios sin salir de esta pantalla.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateForm()}
            className="rounded-[1.1rem] bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Nueva cita
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{dateFilter ? 'Dia elegido' : 'Hoy'}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{appointmentsForReferenceDay.length}</p>
            <p className="mt-1 text-sm text-slate-600">{formatDay(referenceDate)}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confirmadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{confirmedCount}</p>
            <p className="mt-1 text-sm text-slate-600">Listas para atender</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pendientes</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingCount}</p>
            <p className="mt-1 text-sm text-slate-600">Requieren seguimiento</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Realizadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{completedCount}</p>
            <p className="mt-1 text-sm text-slate-600">
              {nextAppointment ? `Siguiente: ${formatTimeRange(nextAppointment.starts_at, nextAppointment.ends_at)}` : 'Sin proximas citas'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_380px]">
        <div className="panel calendar-shell min-w-0 rounded-[2rem] p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filtros</p>
              <h3 className="mt-2 text-2xl text-slate-950">Calendario</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Fecha</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Estado</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as AppointmentStatusFilter)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">Todos</option>
                  {appointmentStatuses.map((status) => (
                    <option value={status.value} key={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Profesional</span>
                <select
                  value={dentistFilter}
                  onChange={(event) => setDentistFilter(Number(event.target.value) || '')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">Todo el equipo</option>
                  {dentists.map((dentist: Dentist) => (
                    <option value={dentist.id} key={dentist.id}>
                      {dentist.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tratamiento</span>
                <select
                  value={treatmentFilter}
                  onChange={(event) => setTreatmentFilter(Number(event.target.value) || '')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">Todos</option>
                  {treatments.map((treatment: Treatment) => (
                    <option value={treatment.id} key={treatment.id}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {isLoading && <p className="px-3 py-2 text-sm text-slate-500">Cargando agenda...</p>}

          {appointmentsError && (
            <p className="px-3 py-2 text-sm text-rose-700">
              {(appointmentsRequestError as Error | undefined)?.message || 'No fue posible cargar las citas'}.
            </p>
          )}

          {!isLoading && (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              firstDay={1}
              locale="es"
              allDaySlot={false}
              selectable
              selectMirror
              nowIndicator
              expandRows
              stickyHeaderDates
              dayMaxEventRows={3}
              navLinks
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              slotDuration="00:30:00"
              slotLabelInterval="01:00"
              height="auto"
              events={events}
              eventContent={renderEventContent}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              buttonText={{
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Dia',
              }}
              dayHeaderFormat={{
                weekday: 'short',
                day: 'numeric',
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              select={(selection: DateSelectArg) => {
                if (!selection.start || !selection.end) return;
                openCreateForm(selection.start.toISOString(), selection.end.toISOString());
              }}
              eventClick={(info: EventClickArg) => {
                setSelectedEventId(Number(info.event.id));
                setShowForm(false);
                setEditingAppointmentId(null);
              }}
            />
          )}

          {treatmentFilter ? (
            <p className="mt-4 text-sm text-slate-500">
              Mostrando {visibleAppointments.length} citas para el tratamiento seleccionado.
            </p>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hoy y proximamente</p>
                <h3 className="mt-2 text-2xl text-slate-950">Proximas citas</h3>
              </div>
              <span className="pill">{upcomingAppointments.length} visibles</span>
            </div>

            <div className="mt-5 space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-slate-500">No hay citas proximas con los filtros actuales.</p>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const statusMeta = getStatusMeta(appointment.status);
                  const treatmentName =
                    appointment.treatment_type ||
                    appointment.treatment?.name ||
                    treatmentLabel(appointment.treatment_id, treatments) ||
                    'Cita general';

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(appointment.id);
                        setShowForm(false);
                      }}
                      className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                        selectedEventId === appointment.id
                          ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]'
                          : 'border-slate-200 bg-white/75 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {toDisplayName(appointment.patient, appointment.patient_id)}
                          </p>
                          <p
                            className={`mt-1 text-sm ${
                              selectedEventId === appointment.id ? 'text-white/75' : 'text-slate-600'
                            }`}
                          >
                            {treatmentName}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            selectedEventId === appointment.id ? 'bg-white/15 text-white' : statusMeta.badgeClass
                          }`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p
                        className={`mt-3 text-sm ${
                          selectedEventId === appointment.id ? 'text-white/80' : 'text-slate-600'
                        }`}
                      >
                        {formatDateTime(appointment.starts_at)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="panel rounded-[1.75rem] p-5">{renderSidePanel()}</div>
        </div>
      </div>
    </section>
  );
}
