import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  createPublicBooking,
  fetchAvailability,
  fetchPublicClinicSettings,
  fetchPublicDentists,
  fetchPublicTreatments,
} from '@/shared/api/resources';
import type { Dentist, Treatment } from '@/shared/types/catalog';
import type { AvailabilitySlot } from '@/shared/types/booking';
import { getClinicPortalPath, syncClinicSlug } from '@/shared/clinic/paths';

type BookingForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type SelectId = number | '';

const defaultDate = new Date().toISOString().slice(0, 10);

export function PublicBookingPage() {
  const { clinicSlug: clinicSlugParam } = useParams();
  const clinicSlug = syncClinicSlug(clinicSlugParam);
  const [searchDate, setSearchDate] = useState(defaultDate);
  const [treatmentId, setTreatmentId] = useState<SelectId>('');
  const [dentistId, setDentistId] = useState<SelectId>('');
  const [selectedSlotKey, setSelectedSlotKey] = useState('');
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const { data: dentists = [] } = useQuery({
    queryKey: ['public-dentists'],
    queryFn: fetchPublicDentists,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['public-treatments'],
    queryFn: fetchPublicTreatments,
  });

  const { data: clinicSettings } = useQuery({
    queryKey: ['public-clinic-settings', 'booking'],
    queryFn: fetchPublicClinicSettings,
    staleTime: 60_000,
  });

  const { data: slots = [], isLoading, isError, error } = useQuery({
    queryKey: ['availability', searchDate, treatmentId, dentistId],
    queryFn: () =>
      fetchAvailability({
        date: searchDate,
        treatment_id: treatmentId || null,
        dentist_id: dentistId || null,
      }),
    enabled: searchDate.length > 0,
  });

  const bookingMutation = useMutation({
    mutationFn: createPublicBooking,
    onSuccess: () => {
      setSelectedSlotKey('');
      setBookingForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
      });
    },
  });

  useEffect(() => {
    setSelectedSlotKey('');
  }, [searchDate, treatmentId, dentistId]);

  const sortedSlots = useMemo(
    () =>
      slots
        .map((slot) => {
          const dentistName = slot.dentist_id
            ? dentists.find((dentist) => dentist.id === slot.dentist_id)?.name ?? null
            : null;

          return {
            ...slot,
            dentist_name: dentistName,
            key: `${slot.dentist_id ?? 'any'}-${slot.starts_at}-${slot.ends_at}`,
            label: `${new Date(slot.starts_at).toLocaleString('es-ES', {
              dateStyle: 'short',
              timeStyle: 'short',
            })} - ${new Date(slot.ends_at).toLocaleString('es-ES', { timeStyle: 'short' })}${
              dentistName ? ` - ${dentistName}` : ''
            }`,
          };
        })
        .sort((a, b) => {
          const startsAtCompare = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
          if (startsAtCompare !== 0) {
            return startsAtCompare;
          }

          return (a.dentist_name ?? '').localeCompare(b.dentist_name ?? '', 'es');
        }),
    [dentists, slots],
  );

  const selectedSlot = useMemo(
    () => sortedSlots.find((slot) => slot.key === selectedSlotKey) ?? null,
    [selectedSlotKey, sortedSlots],
  );

  const canSubmit = Boolean(
    searchDate &&
      selectedSlot &&
      bookingForm.first_name.trim() &&
      bookingForm.last_name.trim() &&
      bookingForm.email.trim() &&
      bookingForm.phone.trim() &&
      (selectedSlot.dentist_id || dentistId),
  );

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || !selectedSlot) {
      return;
    }

    bookingMutation.mutate({
      patient: {
        first_name: bookingForm.first_name.trim(),
        last_name: bookingForm.last_name.trim(),
        email: bookingForm.email.trim(),
        phone: bookingForm.phone.trim(),
      },
      treatment_id: treatmentId || null,
      dentist_id: selectedSlot.dentist_id ?? (dentistId || null),
      slot: selectedSlot.starts_at,
    });
  };

  const heroStyles: CSSProperties = {
    background: `linear-gradient(140deg, ${clinicSettings?.primary_color ?? '#0f766e'} 0%, ${clinicSettings?.secondary_color ?? '#0f172a'} 100%)`,
  };

  return (
    <section className="min-h-screen px-3 py-3 md:px-6">
      <div className="w-full space-y-6">
        <div className="panel-dark page-hero rounded-[2.4rem] p-6 md:p-8" style={heroStyles}>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="pill border-white/12 bg-white/10 text-white/80">Reserva online</span>
              <h1 className="mt-5 text-5xl leading-tight text-white md:text-6xl">
                {clinicSettings?.brand_name || 'Reserva online'}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/76">
                Elige el dia y la hora que mejor te venga. Cuando termines, la clinica recibira tu solicitud de cita.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <Link to={getClinicPortalPath('login', clinicSlug)} className="rounded-[1rem] bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-100">
                  Acceder al portal
                </Link>
                <Link to="/login" className="rounded-[1rem] border border-white/14 px-4 py-3 font-semibold text-white hover:bg-white/10">
                  Acceso staff
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                <p className="text-sm text-white/65">Contacto</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {clinicSettings?.public_phone || clinicSettings?.public_email || 'Disponible online'}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                <p className="text-sm text-white/65">Disponibilidad</p>
                <p className="mt-2 text-lg font-semibold text-white">{sortedSlots.length} horarios disponibles</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="panel rounded-[1.9rem] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="pill pill-strong">Paso 1</span>
                  <h2 className="mt-3 text-3xl text-slate-950">Elige dia y profesional</h2>
                </div>
                <span className="pill">{searchDate}</span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Fecha</span>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(event) => setSearchDate(event.target.value)}
                    className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Tratamiento</span>
                  <select
                    value={treatmentId}
                    onChange={(event) => setTreatmentId(Number(event.target.value) || '')}
                    className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  >
                    <option value="">Todos</option>
                    {treatments.map((treatment: Treatment) => (
                      <option value={treatment.id} key={treatment.id}>
                        {treatment.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-600">Profesional</span>
                  <select
                    value={dentistId}
                    onChange={(event) => setDentistId(Number(event.target.value) || '')}
                    className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  >
                    <option value="">Cualquiera del equipo</option>
                    {dentists.map((dentist: Dentist) => (
                      <option value={dentist.id} key={dentist.id}>
                        {dentist.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="panel rounded-[1.9rem] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="pill">Paso 2</span>
                  <h2 className="mt-3 text-3xl text-slate-950">Horarios disponibles</h2>
                </div>
                <span className="pill">{sortedSlots.length} horarios</span>
              </div>

              {isLoading && <p className="mt-4 text-sm text-slate-500">Buscando disponibilidad...</p>}
              {isError && <p className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{(error as Error | undefined)?.message || 'No se pudo consultar disponibilidad'}</p>}
              {!isLoading && sortedSlots.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">No hay huecos para los filtros seleccionados.</p>
              )}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {sortedSlots.map((slot: AvailabilitySlot & { key: string; dentist_name?: string | null; label: string }) => (
                  <button
                    type="button"
                    key={slot.key}
                    onClick={() => setSelectedSlotKey(slot.key)}
                    className={`rounded-[1.2rem] border px-4 py-4 text-left ${
                      selectedSlotKey === slot.key
                        ? 'border-teal-600 bg-teal-50 shadow-[0_12px_24px_rgba(15,118,110,0.12)]'
                        : 'border-slate-300 bg-white/80 hover:bg-white'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-950">{slot.label}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {slot.dentist_name || 'Asignacion automatica'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={submitBooking} className="panel h-fit rounded-[1.9rem] p-5 md:sticky md:top-6 md:p-6">
            <span className="pill pill-strong">Paso 3</span>
            <h2 className="mt-3 text-3xl text-slate-950">Confirmar reserva</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Dejanos tus datos para que la clinica pueda confirmar la cita contigo.
            </p>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Horario elegido</p>
              
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {selectedSlot
                  ? `${new Date(selectedSlot.starts_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}${
                      selectedSlot.dentist_name ? ` - ${selectedSlot.dentist_name}` : ''
                    }`
                  : 'Aun no has elegido horario'}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Nombre</span>
                <input
                  value={bookingForm.first_name}
                  onChange={(event) => setBookingForm((previous) => ({ ...previous, first_name: event.target.value }))}
                  required
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Apellido</span>
                <input
                  value={bookingForm.last_name}
                  onChange={(event) => setBookingForm((previous) => ({ ...previous, last_name: event.target.value }))}
                  required
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Email</span>
                <input
                  type="email"
                  value={bookingForm.email}
                  onChange={(event) => setBookingForm((previous) => ({ ...previous, email: event.target.value }))}
                  required
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Telefono</span>
                <input
                  value={bookingForm.phone}
                  onChange={(event) => setBookingForm((previous) => ({ ...previous, phone: event.target.value }))}
                  required
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || bookingMutation.isPending}
              className="mt-5 w-full rounded-[1rem] bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
                {bookingMutation.isPending ? 'Reservando...' : 'Reservar cita'}
              </button>

            {bookingMutation.isError && (
              <p className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {(bookingMutation.error as Error | undefined)?.message || 'No se pudo reservar'}
              </p>
            )}
            {bookingMutation.isSuccess && (
              <p className="mt-4 rounded-[1rem] border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
                Solicitud enviada correctamente.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
