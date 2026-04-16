import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicClinicSettings, fetchPublicDentists, fetchPublicTreatments } from '@/shared/api/resources';
import { getClinicPortalPath, syncClinicSlug } from '@/shared/clinic/paths';
import { DEFAULT_CLINIC_BRAND, DEFAULT_CLINIC_HERO_COPY, DEFAULT_CLINIC_PHONE } from '@/shared/clinic/defaults';
import type { Dentist, Treatment } from '@/shared/types/catalog';

const careSteps = [
  {
    title: 'Reserva cuando quieras',
    description: 'Pide cita online en pocos pasos y elige el horario que mejor te venga.',
  },
  {
    title: 'Habla con la clinica',
    description: 'Desde tu area privada puedes escribir, revisar documentos y seguir tus citas.',
  },
  {
    title: 'Todo mas a mano',
    description: 'Citas, facturas y consentimientos quedan reunidos en un mismo sitio.',
  },
];

const patientHighlights = [
  'Proximas citas y cambios de horario',
  'Documentos y consentimientos',
  'Facturas y pagos pendientes',
  'Mensajes directos con la clinica',
];

export function ClinicPortalLandingPage() {
  const { clinicSlug: clinicSlugParam } = useParams();
  const clinicSlug = syncClinicSlug(clinicSlugParam);

  const { data: clinicSettings, isLoading: clinicLoading, isError: clinicError, error: clinicQueryError } = useQuery({
    queryKey: ['public-clinic-settings', 'portal-landing', clinicSlug],
    queryFn: fetchPublicClinicSettings,
    staleTime: 60_000,
  });

  const { data: dentists = [] } = useQuery({
    queryKey: ['public-dentists', clinicSlug],
    queryFn: fetchPublicDentists,
    staleTime: 60_000,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['public-treatments', clinicSlug],
    queryFn: fetchPublicTreatments,
    staleTime: 60_000,
  });

  const featuredTreatments = useMemo(() => treatments.slice(0, 6), [treatments]);
  const featuredDentists = useMemo(() => dentists.slice(0, 4), [dentists]);

  const heroStyles = useMemo(
    () => ({
      background: `linear-gradient(145deg, ${clinicSettings?.primary_color ?? '#0f766e'} 0%, ${clinicSettings?.secondary_color ?? '#0f172a'} 100%)`,
    }),
    [clinicSettings?.primary_color, clinicSettings?.secondary_color],
  );

  return (
    <section className="min-h-screen px-3 py-3 md:px-6">
      <div className="w-full space-y-6">
        {clinicLoading && <p className="px-2 text-sm text-slate-500">Cargando la web de la clinica...</p>}
        {clinicError && (
          <div className="panel rounded-[1.6rem] p-5">
            <p className="text-sm text-rose-700">
              {(clinicQueryError as Error | undefined)?.message || 'No se pudo cargar la clinica seleccionada.'}
            </p>
            <Link to="/alta-clinica" className="mt-4 inline-flex rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Registrar una clinica
            </Link>
          </div>
        )}

        <div className="panel-dark page-hero rounded-[2.5rem] p-6 md:p-8" style={heroStyles}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="pill border-white/12 bg-white/10 text-white/80">Web y portal del paciente</span>
              <h1 className="mt-5 text-5xl leading-tight text-white md:text-6xl">
                {clinicSettings?.website?.hero_title || clinicSettings?.brand_name || DEFAULT_CLINIC_BRAND}
              </h1>
              <p className="mt-4 text-base leading-8 text-white/76">
                {clinicSettings?.website?.hero_copy || DEFAULT_CLINIC_HERO_COPY}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {clinicSettings?.booking_enabled !== false && (
                  <Link
                    to={getClinicPortalPath('booking', clinicSlug)}
                    className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                  >
                    Pedir cita
                  </Link>
                )}
                <Link
                  to={getClinicPortalPath('login', clinicSlug)}
                  className="rounded-[1rem] border border-white/14 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Acceder a mi area
                </Link>
                <Link
                  to="/alta-clinica"
                  className="rounded-[1rem] border border-white/14 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Registrar una clinica
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                <p className="text-sm text-white/65">Contacto</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {clinicSettings?.public_phone || clinicSettings?.public_email || DEFAULT_CLINIC_PHONE}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                <p className="text-sm text-white/65">Tratamientos</p>
                <p className="mt-2 text-lg font-semibold text-white">{treatments.length} opciones activas</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="panel rounded-[2rem] p-6">
            <span className="pill pill-strong">La clinica online</span>
            <h2 className="mt-4 text-4xl text-slate-950">Todo empieza aqui</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {careSteps.map((step) => (
                <div key={step.title} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-5">
                  <p className="text-lg font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <span className="pill">Area privada</span>
            <h2 className="mt-4 text-4xl text-slate-950">Tu espacio como paciente</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              El portal del paciente forma parte de la web. Desde aqui cada persona puede entrar en su zona privada y consultar:
            </p>

            <div className="mt-5 grid gap-3">
              {patientHighlights.map((item) => (
                <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>

            <Link
              to={getClinicPortalPath('login', clinicSlug)}
              className="mt-5 inline-flex rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Entrar en mi area
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="pill pill-strong">Tratamientos</span>
                <h2 className="mt-4 text-4xl text-slate-950">Servicios destacados</h2>
              </div>
              {clinicSettings?.booking_enabled !== false && (
                <Link
                  to={getClinicPortalPath('booking', clinicSlug)}
                  className="rounded-[1rem] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  Ver horarios
                </Link>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredTreatments.length === 0 && (
                <p className="text-sm text-slate-500">{DEFAULT_CLINIC_BRAND} aun no ha publicado tratamientos en esta web.</p>
              )}
              {featuredTreatments.map((treatment: Treatment) => (
                <div key={treatment.id} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-5">
                  <p className="text-lg font-semibold text-slate-950">{treatment.name}</p>
                  <p className="mt-3 text-sm text-slate-600">{treatment.duration_minutes} min</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {(treatment.price_cents / 100).toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-[2rem] p-6">
            <span className="pill">Equipo</span>
            <h2 className="mt-4 text-4xl text-slate-950">Profesionales</h2>
            <div className="mt-5 space-y-3">
              {featuredDentists.length === 0 && (
                <p className="text-sm text-slate-500">Aun no hay profesionales visibles en esta pagina.</p>
              )}
              {featuredDentists.map((dentist: Dentist) => (
                <div key={dentist.id} className="rounded-[1.4rem] border border-slate-200 bg-white/75 p-4">
                  <p className="font-semibold text-slate-950">{dentist.name}</p>
                  <p className="mt-2 text-sm text-slate-600">Atencion y seguimiento clinico.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
