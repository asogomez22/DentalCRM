import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StatCard } from '@/components/StatCard';
import {
  cancelPatientPortalAppointment,
  createPatientPortalPrivacyRequest,
  createPatientPortalReferral,
  createPatientPortalReview,
  downloadPatientPortalDocument,
  fetchPatientPortalAppointments,
  fetchPatientPortalCommunications,
  fetchPatientPortalConsents,
  fetchPatientPortalDocuments,
  fetchPatientPortalInvoices,
  fetchPatientPortalPrivacyRequests,
  fetchPatientPortalReferrals,
  fetchPatientPortalReviews,
  fetchPatientPortalSummary,
  logoutPatientPortal,
  sendPatientPortalMessage,
} from '@/shared/api/resources';
import { getPatientPortalClinic, getPatientPortalProfile } from '@/shared/auth/patientPortalSession';
import type { Appointment } from '@/shared/types/appointment';
import type { Invoice } from '@/shared/types/invoice';
import type { PatientDocument } from '@/shared/types/document';
import { getClinicPortalPath, syncClinicSlug } from '@/shared/clinic/paths';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

type MessageFormState = {
  subject: string;
  body: string;
};

type ReviewFormState = {
  appointment_id: string;
  rating: string;
  comment: string;
};

type ReferralFormState = {
  referred_name: string;
  referred_email: string;
  referred_phone: string;
};

type PrivacyFormState = {
  type: 'export' | 'delete';
  notes: string;
};

const emptyMessageForm = (): MessageFormState => ({ subject: '', body: '' });
const emptyReviewForm = (): ReviewFormState => ({ appointment_id: '', rating: '5', comment: '' });
const emptyReferralForm = (): ReferralFormState => ({ referred_name: '', referred_email: '', referred_phone: '' });
const emptyPrivacyForm = (): PrivacyFormState => ({ type: 'export', notes: '' });

function formatCurrency(valueCents: number) {
  return currencyFormatter.format(valueCents / 100);
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

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-ES') : '-';
}

function invoiceStatusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'partially_paid':
      return 'bg-amber-100 text-amber-700';
    case 'cancelled':
      return 'bg-slate-200 text-slate-600';
    default:
      return 'bg-rose-100 text-rose-700';
  }
}

function invoiceStatusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'Pagada';
    case 'partially_paid':
      return 'Pago parcial';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

function appointmentStatusClass(status: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-teal-100 text-teal-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-slate-200 text-slate-600';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

function appointmentStatusLabel(status: string) {
  switch (status) {
    case 'confirmed':
      return 'Confirmada';
    case 'completed':
      return 'Realizada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

function messageDirectionLabel(direction: string) {
  return direction === 'inbound' ? 'Recibido' : 'Enviado';
}

function privacyTypeLabel(type: string) {
  return type === 'delete' ? 'Borrado de datos' : 'Copia de mis datos';
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

function consentTypeLabel(type: string) {
  switch (type) {
    case 'marketing':
      return 'Comunicaciones';
    case 'data_processing':
      return 'Proteccion de datos';
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

function canCancelAppointment(appointment: Appointment) {
  return ['pending', 'confirmed'].includes(appointment.status) && new Date(appointment.starts_at).getTime() > Date.now();
}

export function PatientPortalPage() {
  const navigate = useNavigate();
  const { clinicSlug: clinicSlugParam } = useParams();
  const queryClient = useQueryClient();
  const clinicSlug = syncClinicSlug(clinicSlugParam);
  const [messageForm, setMessageForm] = useState<MessageFormState>(emptyMessageForm);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(emptyReviewForm);
  const [referralForm, setReferralForm] = useState<ReferralFormState>(emptyReferralForm);
  const [privacyForm, setPrivacyForm] = useState<PrivacyFormState>(emptyPrivacyForm);

  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryQueryError } = useQuery({
    queryKey: ['portal-summary'],
    queryFn: fetchPatientPortalSummary,
  });

  const { data: appointments = [] } = useQuery({ queryKey: ['portal-appointments'], queryFn: fetchPatientPortalAppointments });
  const { data: invoices = [] } = useQuery({ queryKey: ['portal-invoices'], queryFn: fetchPatientPortalInvoices });
  const { data: documents = [] } = useQuery({ queryKey: ['portal-documents'], queryFn: fetchPatientPortalDocuments });
  const { data: communications = [] } = useQuery({ queryKey: ['portal-communications'], queryFn: fetchPatientPortalCommunications });
  const { data: reviews = [] } = useQuery({ queryKey: ['portal-reviews'], queryFn: fetchPatientPortalReviews });
  const { data: referrals = [] } = useQuery({ queryKey: ['portal-referrals'], queryFn: fetchPatientPortalReferrals });
  const { data: privacyRequests = [] } = useQuery({ queryKey: ['portal-privacy-requests'], queryFn: fetchPatientPortalPrivacyRequests });
  const { data: consents = [] } = useQuery({ queryKey: ['portal-consents'], queryFn: fetchPatientPortalConsents });

  const logoutMutation = useMutation({
    mutationFn: logoutPatientPortal,
    onSettled: () => navigate(getClinicPortalPath('login', clinicSlug), { replace: true }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPatientPortalAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-summary'] });
      queryClient.invalidateQueries({ queryKey: ['portal-appointments'] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: ({ id, originalName }: { id: number; originalName: string }) =>
      downloadPatientPortalDocument(id, originalName),
  });

  const messageMutation = useMutation({
    mutationFn: sendPatientPortalMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-communications'] });
      setMessageForm(emptyMessageForm());
    },
  });

  const reviewMutation = useMutation({
    mutationFn: createPatientPortalReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-reviews'] });
      setReviewForm(emptyReviewForm());
    },
  });

  const referralMutation = useMutation({
    mutationFn: createPatientPortalReferral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['portal-summary'] });
      setReferralForm(emptyReferralForm());
    },
  });

  const privacyMutation = useMutation({
    mutationFn: createPatientPortalPrivacyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-privacy-requests'] });
      setPrivacyForm(emptyPrivacyForm());
    },
  });

  useEffect(() => {
    const handler = () => navigate(getClinicPortalPath('login', clinicSlug), { replace: true });
    window.addEventListener('dentalcrm:patient-auth-expired', handler);
    return () => window.removeEventListener('dentalcrm:patient-auth-expired', handler);
  }, [clinicSlug, navigate]);

  const clinic = summary?.clinic ?? getPatientPortalClinic();
  const patient = summary?.patient ?? getPatientPortalProfile();
  const pendingInvoices = useMemo(() => invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled'), [invoices]);
  const recentDocuments = useMemo(() => documents.slice(0, 6), [documents]);
  const reviewableAppointments = useMemo(() => appointments.filter((appointment) => appointment.status === 'completed'), [appointments]);
  const heroStyles: CSSProperties = {
    background: `linear-gradient(145deg, ${clinic?.primary_color ?? '#0f766e'} 0%, ${clinic?.secondary_color ?? '#0f172a'} 100%)`,
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    messageMutation.mutate({
      subject: messageForm.subject.trim() || null,
      body: messageForm.body.trim(),
    });
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reviewMutation.mutate({
      appointment_id: reviewForm.appointment_id ? Number(reviewForm.appointment_id) : null,
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment.trim() || null,
    });
  };

  const submitReferral = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    referralMutation.mutate({
      referred_name: referralForm.referred_name.trim(),
      referred_email: referralForm.referred_email.trim() || null,
      referred_phone: referralForm.referred_phone.trim() || null,
    });
  };

  const submitPrivacyRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    privacyMutation.mutate({
      type: privacyForm.type,
      notes: privacyForm.notes.trim() || null,
    });
  };

  return (
    <section className="min-h-screen px-3 py-3 md:px-6">
      <div className="w-full space-y-6">
        <div className="panel-dark page-hero rounded-[2.4rem] p-6 md:p-8" style={heroStyles}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="pill border-white/12 bg-white/10 text-white/80">Portal del paciente</span>
              <h1 className="mt-5 text-5xl leading-tight text-white md:text-6xl">
                Hola, {patient?.first_name || 'paciente'}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/76">
                Aqui puedes revisar tus citas, descargar documentos y escribir a la clinica.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={getClinicPortalPath('booking', clinicSlug)}
                className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
              >
                Reservar nueva cita
              </Link>
              <Link
                to={getClinicPortalPath('landing', clinicSlug)}
                className="rounded-[1rem] border border-white/14 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Volver a la web
              </Link>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="rounded-[1rem] border border-white/14 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:bg-white/10"
              >
                {logoutMutation.isPending ? 'Cerrando...' : 'Salir'}
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
              <p className="text-sm text-white/65">Email</p>
              <p className="mt-2 text-lg font-semibold text-white">{patient?.email || 'No disponible'}</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
              <p className="text-sm text-white/65">Telefono</p>
              <p className="mt-2 text-lg font-semibold text-white">{patient?.phone || clinic?.public_phone || 'No disponible'}</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
              <p className="text-sm text-white/65">Puntos</p>
              <p className="mt-2 text-lg font-semibold text-white">{patient?.portal_points ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {summaryLoading && <p className="text-sm text-slate-500">Cargando portal...</p>}
          {summaryError && (
            <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {(summaryQueryError as Error | undefined)?.message || 'No se pudo cargar el portal del paciente'}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Proximas citas" value={String(summary?.upcoming_appointments_count ?? 0)} hint="Reservas pendientes" />
            <StatCard label="Documentos" value={String(summary?.documents_count ?? 0)} hint="Adjuntos del expediente" />
            <StatCard label="Facturas pendientes" value={String(summary?.pending_invoices_count ?? 0)} hint="Por liquidar" />
            <StatCard label="Saldo" value={formatCurrency(summary?.pending_balance_cents ?? 0)} hint="Pendiente de pago" />
            <StatCard label="Mensajes" value={String(communications.length)} hint="Conversaciones guardadas" />
            <StatCard label="Puntos" value={String(patient?.portal_points ?? 0)} hint="Invitaciones realizadas" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="panel rounded-[1.9rem] p-6">
              <h2 className="text-3xl text-slate-950">Siguiente cita</h2>
              {summary?.next_appointment ? (
                <div className="mt-5 rounded-[1.7rem] border border-teal-100 bg-teal-50/90 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                    {summary.next_appointment.treatment?.name || summary.next_appointment.treatment_type || 'Cita dental'}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{formatDateTime(summary.next_appointment.starts_at)}</p>
                  <p className="mt-3 text-sm text-slate-600">
                    Profesional: {summary.next_appointment.dentist?.name || 'Pendiente de asignar'}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No tienes citas proximas. Si lo necesitas, puedes pedir una nueva cita.</p>
              )}
            </div>

            <div className="panel rounded-[1.9rem] p-6">
              <h2 className="text-3xl text-slate-950">Facturas abiertas</h2>
              <div className="mt-4 space-y-3">
                {pendingInvoices.length === 0 && <p className="text-sm text-slate-500">No tienes facturas pendientes.</p>}
                {pendingInvoices.map((invoice: Invoice) => (
                  <div key={invoice.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{invoice.number}</p>
                        <p className="mt-1 text-sm text-slate-500">Emitida el {formatDate(invoice.issued_at)}</p>
                      </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoiceStatusClass(invoice.status)}`}>
                        {invoiceStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      Pendiente: <span className="font-semibold text-slate-950">{formatCurrency(Math.max(invoice.total_cents - invoice.paid_cents, 0))}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel rounded-[1.9rem] p-6">
            <h2 className="text-3xl text-slate-950">Mis citas</h2>
            <div className="mt-4 space-y-3">
              {appointments.length === 0 && <p className="text-sm text-slate-500">Todavia no tienes citas en el historial.</p>}
              {appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{appointment.treatment?.name || appointment.treatment_type || 'Cita dental'}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDateTime(appointment.starts_at)}</p>
                      <p className="mt-1 text-sm text-slate-500">Profesional: {appointment.dentist?.name || 'Pendiente de asignar'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointmentStatusClass(appointment.status)}`}>
                        {appointmentStatusLabel(appointment.status)}
                      </span>
                      {canCancelAppointment(appointment) && (
                        <button type="button" onClick={() => cancelMutation.mutate(appointment.id)} disabled={cancelMutation.isPending} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-[1.9rem] p-6">
            <h2 className="text-3xl text-slate-950">Documentos recientes</h2>
            <div className="mt-4 space-y-3">
              {recentDocuments.length === 0 && <p className="text-sm text-slate-500">Todavia no hay documentos publicados para tu expediente.</p>}
              {recentDocuments.map((document: PatientDocument) => (
                <div key={document.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                  <p className="font-semibold text-slate-950">{document.original_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{document.category} - {formatDate(document.created_at)}</p>
                  <button type="button" onClick={() => downloadMutation.mutate({ id: document.id, originalName: document.original_name })} disabled={downloadMutation.isPending} className="mt-3 rounded-[1rem] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50">
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <form onSubmit={submitMessage} className="panel rounded-[1.9rem] p-6">
            <h2 className="text-3xl text-slate-950">Mensajes</h2>
            <div className="mt-4 space-y-4">
              <input value={messageForm.subject} onChange={(event) => setMessageForm((previous) => ({ ...previous, subject: event.target.value }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Asunto opcional" />
              <textarea value={messageForm.body} onChange={(event) => setMessageForm((previous) => ({ ...previous, body: event.target.value }))} className="min-h-32 w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Escribe tu consulta" />
            </div>
            <button type="submit" disabled={messageMutation.isPending || !messageForm.body.trim()} className="mt-5 rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300">
              {messageMutation.isPending ? 'Enviando...' : 'Enviar mensaje'}
            </button>

            <div className="mt-5 space-y-3">
              {communications.slice(0, 6).map((message) => (
                <div key={message.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{messageDirectionLabel(message.direction)}</p>
                  {message.subject && <p className="mt-2 font-semibold text-slate-950">{message.subject}</p>}
                  <p className="mt-2 text-sm text-slate-600">{message.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(message.created_at)}</p>
                </div>
              ))}
              {communications.length === 0 && <p className="text-sm text-slate-500">Todavia no hay mensajes en el portal.</p>}
            </div>
          </form>

          <div className="space-y-6">
            <form onSubmit={submitReview} className="panel rounded-[1.9rem] p-6">
              <h2 className="text-3xl text-slate-950">Valoracion</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <select value={reviewForm.appointment_id} onChange={(event) => setReviewForm((previous) => ({ ...previous, appointment_id: event.target.value }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5 md:col-span-2">
                  <option value="">Sin cita asociada</option>
                  {reviewableAppointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {appointment.treatment?.name || appointment.treatment_type || 'Cita'} - {formatDate(appointment.starts_at)}
                    </option>
                  ))}
                </select>
                <select value={reviewForm.rating} onChange={(event) => setReviewForm((previous) => ({ ...previous, rating: event.target.value }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} estrellas
                    </option>
                  ))}
                </select>
              </div>
              <textarea value={reviewForm.comment} onChange={(event) => setReviewForm((previous) => ({ ...previous, comment: event.target.value }))} className="mt-4 min-h-28 w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Cuentanos como fue tu visita" />
              <button type="submit" disabled={reviewMutation.isPending} className="mt-5 rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50">
                {reviewMutation.isPending ? 'Guardando...' : 'Enviar valoracion'}
              </button>
              <div className="mt-4 space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                    <p className="font-semibold text-slate-950">{review.rating}/5</p>
                    {review.comment && <p className="mt-2 text-sm text-slate-600">{review.comment}</p>}
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(review.created_at)}</p>
                  </div>
                ))}
                {reviews.length === 0 && <p className="text-sm text-slate-500">Todavia no has enviado ninguna valoracion.</p>}
              </div>
            </form>

            <form onSubmit={submitReferral} className="panel rounded-[1.9rem] p-6">
              <h2 className="text-3xl text-slate-950">Recomendar a alguien</h2>
              <div className="mt-4 space-y-4">
                <input value={referralForm.referred_name} onChange={(event) => setReferralForm((previous) => ({ ...previous, referred_name: event.target.value }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Nombre de la persona referida" />
                <input value={referralForm.referred_email} onChange={(event) => setReferralForm((previous) => ({ ...previous, referred_email: event.target.value }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Email" />
                <input value={referralForm.referred_phone} onChange={(event) => setReferralForm((previous) => ({ ...previous, referred_phone: event.target.value }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Telefono" />
              </div>
              <button type="submit" disabled={referralMutation.isPending || !referralForm.referred_name.trim()} className="mt-5 rounded-[1rem] bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300">
                {referralMutation.isPending ? 'Enviando...' : 'Registrar referido'}
              </button>
              <div className="mt-4 space-y-3">
                {referrals.map((referral) => (
                  <div key={referral.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                    <p className="font-semibold text-slate-950">{referral.referred_name}</p>
                    <p className="mt-1 text-sm text-slate-500">Codigo {referral.referral_code}</p>
                    <p className="mt-2 text-xs text-slate-500">Puntos: {referral.reward_points}</p>
                  </div>
                ))}
                {referrals.length === 0 && <p className="text-sm text-slate-500">Aun no has registrado referidos.</p>}
              </div>
            </form>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <form onSubmit={submitPrivacyRequest} className="panel rounded-[1.9rem] p-6">
            <h2 className="text-3xl text-slate-950">Privacidad</h2>
            <div className="mt-4 space-y-4">
              <select value={privacyForm.type} onChange={(event) => setPrivacyForm((previous) => ({ ...previous, type: event.target.value as PrivacyFormState['type'] }))} className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5">
                <option value="export">Quiero una copia de mis datos</option>
                <option value="delete">Quiero solicitar el borrado de mis datos</option>
              </select>
              <textarea value={privacyForm.notes} onChange={(event) => setPrivacyForm((previous) => ({ ...previous, notes: event.target.value }))} className="min-h-28 w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5" placeholder="Explica tu solicitud si lo necesitas" />
            </div>
            <button type="submit" disabled={privacyMutation.isPending} className="mt-5 rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50">
              {privacyMutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <div className="mt-4 space-y-3">
              {privacyRequests.map((request) => (
                <div key={request.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                  <p className="font-semibold text-slate-950">{privacyTypeLabel(request.type)}</p>
                  <p className="mt-1 text-sm text-slate-500">{privacyStatusLabel(request.status)}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(request.requested_at)}</p>
                </div>
              ))}
              {privacyRequests.length === 0 && <p className="text-sm text-slate-500">No has abierto solicitudes de privacidad.</p>}
            </div>
          </form>

          <div className="panel rounded-[1.9rem] p-6">
            <h2 className="text-3xl text-slate-950">Consentimientos</h2>
            <div className="mt-4 space-y-3">
              {consents.map((consent) => (
                <div key={consent.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{consentTypeLabel(consent.type)}</p>
                      <p className="mt-1 text-sm text-slate-500">{consent.document?.original_name || 'Sin documento adjunto'}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {consentStatusLabel(consent.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Firmado: {formatDateTime(consent.signed_at)}</p>
                </div>
              ))}
              {consents.length === 0 && <p className="text-sm text-slate-500">Todavia no hay consentimientos visibles en tu portal.</p>}
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
