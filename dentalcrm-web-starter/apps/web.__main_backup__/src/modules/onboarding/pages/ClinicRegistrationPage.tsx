import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { registerClinic } from '@/shared/api/resources';
import { DEFAULT_CLINIC_BRAND, DEFAULT_CLINIC_EMAIL, DEFAULT_CLINIC_SLUG } from '@/shared/clinic/defaults';

type RegistrationFormState = {
  clinic_name: string;
  slug: string;
  owner_name: string;
  owner_email: string;
  password: string;
  public_phone: string;
  public_email: string;
  plan: string;
  primary_color: string;
  secondary_color: string;
};

const defaultForm: RegistrationFormState = {
  clinic_name: '',
  slug: '',
  owner_name: '',
  owner_email: '',
  password: '',
  public_phone: '',
  public_email: '',
  plan: 'starter',
  primary_color: '#0f766e',
  secondary_color: '#0f172a',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ClinicRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationFormState>(defaultForm);
  const [slugTouched, setSlugTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: registerClinic,
    onSuccess: () => {
      navigate('/dashboard', { replace: true });
    },
  });

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.clinic_name.trim() &&
          form.slug.trim() &&
          form.owner_name.trim() &&
          form.owner_email.trim() &&
          form.password.trim().length >= 8,
      ),
    [form],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    mutation.mutate({
      clinic_name: form.clinic_name.trim(),
      slug: slugify(form.slug),
      owner_name: form.owner_name.trim(),
      owner_email: form.owner_email.trim(),
      password: form.password,
      public_phone: form.public_phone.trim() || null,
      public_email: form.public_email.trim() || null,
      plan: form.plan,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
    });
  };

  return (
    <section className="min-h-screen px-3 py-3 md:px-6">
      <div className="grid min-h-[calc(100vh-1.5rem)] w-full gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="panel-dark page-hero rounded-[2.3rem] p-7 md:p-9">
          <div className="max-w-3xl">
            <span className="pill border-white/12 bg-white/10 text-white/80">Alta de clinica</span>
            <h1 className="mt-5 text-5xl leading-tight text-white md:text-6xl">Crea tu espacio online y tu panel interno.</h1>
            <p className="mt-5 text-base leading-8 text-white/74">
              En unos minutos dejas creada la web pública de la clínica, el acceso privado de pacientes y el panel para el equipo.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                <p className="text-lg font-semibold text-white">Web de la clinica</p>
                <p className="mt-3 text-sm leading-6 text-white/70">Landing pública con reserva, tratamientos y acceso al portal.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                <p className="text-lg font-semibold text-white">Area privada</p>
                <p className="mt-3 text-sm leading-6 text-white/70">Citas, documentos, facturas y mensajes para pacientes.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                <p className="text-lg font-semibold text-white">Panel interno</p>
                <p className="mt-3 text-sm leading-6 text-white/70">Agenda, cobros, pacientes y gestión del día.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/portal" className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                Ver ejemplo
              </Link>
              <Link to="/login" className="rounded-[1rem] border border-white/14 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <form onSubmit={submit} className="panel w-full max-w-2xl rounded-[2.3rem] p-7 md:p-8">
            <span className="pill pill-strong">Nueva clinica</span>
            <h2 className="mt-5 text-4xl text-slate-950">Empieza ahora</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Crea la clínica, tu usuario administrador y la web pública inicial.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-600">Nombre de la clinica</span>
                <input
                  value={form.clinic_name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setForm((previous) => ({
                      ...previous,
                      clinic_name: nextName,
                      slug: slugTouched ? previous.slug : slugify(nextName),
                    }));
                  }}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder={DEFAULT_CLINIC_BRAND}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-600">Slug de la clinica</span>
                <input
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm((previous) => ({ ...previous, slug: slugify(event.target.value) }));
                  }}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder={DEFAULT_CLINIC_SLUG}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Nombre responsable</span>
                <input
                  value={form.owner_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, owner_name: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder="Laura Soto"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Email responsable</span>
                <input
                  type="email"
                  value={form.owner_email}
                  onChange={(event) => setForm((previous) => ({ ...previous, owner_email: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder={DEFAULT_CLINIC_EMAIL}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Contrasena</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder="Minimo 8 caracteres"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Plan</span>
                <select
                  value={form.plan}
                  onChange={(event) => setForm((previous) => ({ ...previous, plan: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Telefono publico</span>
                <input
                  value={form.public_phone}
                  onChange={(event) => setForm((previous) => ({ ...previous, public_phone: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder="+34..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Email publico</span>
                <input
                  type="email"
                  value={form.public_email}
                  onChange={(event) => setForm((previous) => ({ ...previous, public_email: event.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-300 bg-white/90 px-4 py-3.5"
                  placeholder={DEFAULT_CLINIC_EMAIL}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Color principal</span>
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(event) => setForm((previous) => ({ ...previous, primary_color: event.target.value }))}
                  className="h-[54px] w-full rounded-[1rem] border border-slate-300 bg-white/90 px-3 py-2"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-600">Color secundario</span>
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(event) => setForm((previous) => ({ ...previous, secondary_color: event.target.value }))}
                  className="h-[54px] w-full rounded-[1rem] border border-slate-300 bg-white/90 px-3 py-2"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="mt-6 w-full rounded-[1rem] bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {mutation.isPending ? 'Creando clinica...' : 'Crear clinica'}
            </button>

            {mutation.isError && (
              <p className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {(mutation.error as Error | undefined)?.message || 'No se pudo crear la clinica'}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
