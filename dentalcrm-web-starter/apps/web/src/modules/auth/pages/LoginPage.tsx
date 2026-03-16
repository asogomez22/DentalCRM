import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/shared/api/resources';
import { isAuthenticated } from '@/shared/auth/session';
import { getClinicPortalPath } from '@/shared/clinic/paths';

type LocationState = {
  from?: string;
};

type LoginForm = {
  email: string;
  password: string;
};

const initialLogin: LoginForm = {
  email: '',
  password: '',
};

const featureCards = [
  {
    title: 'Agenda del dia',
    description: 'Revisa las citas, los huecos libres y lo que falta por confirmar.',
  },
  {
    title: 'Cobros y gestion',
    description: 'Consulta facturas, pagos, documentos y tareas internas.',
  },
  {
    title: 'Portal del paciente',
    description: 'Mensajes, documentos y reserva online conectados con la clinica.',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [credentials, setCredentials] = useState<LoginForm>(initialLogin);

  const from = (location.state as LocationState | null)?.from || '/dashboard';

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(from, { replace: true });
    }
  }, [from, navigate]);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate(from, { replace: true }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(credentials);
  };

  return (
    <section className="min-h-screen px-3 py-3 sm:px-4 md:px-6">
      <div className="grid min-h-[calc(100vh-1.5rem)] w-full gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <div className="panel-dark page-hero flex overflow-hidden rounded-[2.25rem] p-7 md:p-10">
          <div className="my-auto max-w-3xl">
            <span className="pill border-white/12 bg-white/10 text-white/80">DentalCRM</span>
            <h1 className="mt-5 text-5xl leading-tight text-white md:text-6xl">
              Gestion diaria de la clinica.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/72">
              Entra para revisar la agenda, atender pacientes y llevar el control de cobros y documentos.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((feature) => (
                <div key={feature.title} className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                  <p className="text-lg font-semibold text-white">{feature.title}</p>
                  <p className="mt-3 text-sm leading-6 text-white/70">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={getClinicPortalPath('login')} className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                Portal paciente
              </Link>
              <Link to="/booking" className="rounded-[1rem] border border-white/12 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Reserva online
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <form onSubmit={submit} className="panel w-full max-w-xl rounded-[2.25rem] p-7 md:p-8">
            <span className="pill pill-strong">Acceso staff</span>
            <h2 className="mt-5 text-4xl text-slate-950">Iniciar sesion</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Accede al panel interno de la clinica.
            </p>

            <div className="mt-7 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Email</span>
                <input
                  type="email"
                  required
                  value={credentials.email}
                  onChange={(event) => setCredentials((previous) => ({ ...previous, email: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5 text-slate-950"
                  placeholder="admin@clinica.com"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Contrasena</span>
                <input
                  type="password"
                  required
                  value={credentials.password}
                  onChange={(event) => setCredentials((previous) => ({ ...previous, password: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5 text-slate-950"
                  placeholder="Tu contrasena"
                />
              </label>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full rounded-[1rem] bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                {mutation.isPending ? 'Entrando...' : 'Entrar al panel'}
              </button>

              {mutation.isError && (
                <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {(mutation.error as Error)?.message || 'No se pudo iniciar sesion'}
                </p>
              )}
            </div>

            <div className="soft-divider my-6" />

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to={getClinicPortalPath('login')}
                className="rounded-[1rem] border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Ir al portal
              </Link>
              <Link
                to="/booking"
                className="rounded-[1rem] border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Reservar cita
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
