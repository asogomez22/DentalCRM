import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchPublicClinicSettings, loginPatientPortal } from '@/shared/api/resources';
import { isPatientPortalAuthenticated } from '@/shared/auth/patientPortalSession';
import { getClinicPortalPath, syncClinicSlug } from '@/shared/clinic/paths';
import { DEFAULT_CLINIC_BRAND, DEFAULT_CLINIC_PHONE } from '@/shared/clinic/defaults';

type LocationState = {
  from?: string;
};

type PortalLoginForm = {
  email: string;
  access_key: string;
};

const initialForm: PortalLoginForm = {
  email: '',
  access_key: '',
};

export function PatientPortalLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clinicSlug: clinicSlugParam } = useParams();
  const [credentials, setCredentials] = useState<PortalLoginForm>(initialForm);
  const clinicSlug = syncClinicSlug(clinicSlugParam);

  const from = (location.state as LocationState | null)?.from || getClinicPortalPath('area', clinicSlug);

  const { data: clinicSettings } = useQuery({
    queryKey: ['public-clinic-settings', 'portal'],
    queryFn: fetchPublicClinicSettings,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isPatientPortalAuthenticated()) {
      navigate(from, { replace: true });
    }
  }, [from, navigate]);

  const mutation = useMutation({
    mutationFn: loginPatientPortal,
    onSuccess: () => navigate(from, { replace: true }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      email: credentials.email.trim(),
      access_key: credentials.access_key.trim(),
    });
  };

  const styles: CSSProperties = {
    background: `linear-gradient(135deg, ${clinicSettings?.primary_color ?? '#0f766e'} 0%, ${clinicSettings?.secondary_color ?? '#0f172a'} 100%)`,
  };

  return (
    <section className="min-h-screen p-3 text-slate-900 md:p-6" style={styles}>
      <div className="grid min-h-[calc(100vh-1.5rem)] w-full gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <div className="flex items-center">
          <div className="panel-dark page-hero max-w-3xl rounded-[2.2rem] p-8 text-white md:p-10">
            <span className="pill border-white/12 bg-white/10 text-white/78">Portal del paciente</span>
            <h1 className="mt-5 text-5xl">
              {clinicSettings?.brand_name || DEFAULT_CLINIC_BRAND}
            </h1>
            <p className="mt-4 text-base leading-8 text-white/76">
              Revisa tus citas, documentos y mensajes cuando lo necesites.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                <p className="text-sm text-white/65">Acceso</p>
                <p className="mt-2 text-lg font-semibold">Email + DNI o ultimas 4 cifras del telefono</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                <p className="text-sm text-white/65">Contacto</p>
                <p className="mt-2 text-lg font-semibold">{clinicSettings?.public_phone || clinicSettings?.public_email || DEFAULT_CLINIC_PHONE}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <form
            onSubmit={submit}
            className="panel w-full max-w-xl rounded-[2.2rem] p-7 md:p-8"
          >
            <span className="pill pill-strong">Acceso seguro</span>
            <h2 className="mt-5 text-4xl text-slate-950">Entrar al portal</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Usa el email que diste a la clinica y tu DNI o las ultimas cuatro cifras del telefono.
            </p>

            <div className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Email</span>
                <input
                  type="email"
                  required
                  value={credentials.email}
                  onChange={(event) => setCredentials((previous) => ({ ...previous, email: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">DNI o telefono</span>
                <input
                  required
                  value={credentials.access_key}
                  onChange={(event) => setCredentials((previous) => ({ ...previous, access_key: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                />
              </label>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-[1rem] bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                {mutation.isPending ? 'Entrando...' : 'Abrir portal'}
              </button>

              {mutation.isError && (
                <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {(mutation.error as Error | undefined)?.message || 'No se pudo abrir el portal'}
                </p>
              )}
            </div>

            <div className="soft-divider my-6" />

            <div className="flex flex-wrap gap-3 text-sm">
              <Link to={getClinicPortalPath('booking', clinicSlug)} className="rounded-[1rem] border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-white">
                Reservar cita
              </Link>
              <Link to={getClinicPortalPath('landing', clinicSlug)} className="rounded-[1rem] border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-white">
                Volver a la web
              </Link>
              <Link to="/login" className="rounded-[1rem] border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-white">
                Acceso staff
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
