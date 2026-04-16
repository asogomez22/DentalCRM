import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Patient, PatientCreatePayload } from '@/shared/types/patient';
import { createPatient, fetchPatients, updatePatient } from '@/shared/api/resources';

const emptyPatient: PatientCreatePayload = {
  first_name: '',
  last_name: '',
  dni: '',
  email: '',
  phone: '',
  birth_date: '',
  notes: '',
};

function cleanOptional(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

export function PatientsPage() {
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [form, setForm] = useState<PatientCreatePayload>(emptyPatient);

  const queryClient = useQueryClient();

  const {
    data: patients = [],
    isLoading,
    isError,
    error: patientsError,
  } = useQuery({
    queryKey: ['patients', query],
    queryFn: () => fetchPatients({ search: query.trim() || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PatientCreatePayload }) =>
      updatePatient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditingPatientId(null);
      setForm(emptyPatient);
      setFormOpen(false);
    },
  });

  useEffect(() => {
    if (!formOpen) {
      setEditingPatientId(null);
      setForm(emptyPatient);
    }
  }, [formOpen]);

  const canSubmit =
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0;

  const submitPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const payload: PatientCreatePayload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      dni: cleanOptional(form.dni ?? ''),
      email: cleanOptional(form.email ?? ''),
      phone: cleanOptional(form.phone ?? ''),
      birth_date: cleanOptional(form.birth_date ?? ''),
      notes: cleanOptional(form.notes ?? ''),
    };

    if (editingPatientId) {
      updateMutation.mutate({ id: editingPatientId, payload });
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setForm(emptyPatient);
        setFormOpen(false);
      },
    });
  };

  const startEdit = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      dni: patient.dni ?? '',
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      birth_date: patient.birth_date ?? '',
      notes: patient.notes ?? '',
    });
    setFormOpen(true);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand)]">CRM</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Pacientes</h2>
        </div>

        <div className="flex gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, DNI o telefono"
            className="w-80 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none ring-0 transition focus:border-[var(--color-brand)]"
          />
          <button
            type="button"
            onClick={() => setFormOpen((previous) => !previous)}
            className="rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
          >
            {formOpen ? 'Cerrar formulario' : 'Nuevo paciente'}
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={submitPatient} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{editingPatientId ? 'Editar paciente' : 'Nuevo paciente'}</h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Nombre</span>
              <input
                required
                value={form.first_name}
                onChange={(event) => setForm((previous) => ({ ...previous, first_name: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Apellido</span>
              <input
                required
                value={form.last_name}
                onChange={(event) => setForm((previous) => ({ ...previous, last_name: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">DNI</span>
              <input
                value={form.dni ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, dni: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Email</span>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Telefono</span>
              <input
                value={form.phone ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Fecha de nacimiento</span>
              <input
                type="date"
                value={form.birth_date ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, birth_date: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
            <label className="space-y-2 md:col-span-3">
              <span className="text-sm text-slate-600">Notas</span>
              <textarea
                value={form.notes ?? ''}
                onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSubmit || createMutation.isPending || updateMutation.isPending}
              className="rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : editingPatientId
                  ? 'Actualizar paciente'
                  : 'Guardar paciente'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
          </div>

          {(createMutation.error || updateMutation.error) && (
            <p className="text-sm text-rose-600">
              {(createMutation.error as Error | undefined)?.message ||
                (updateMutation.error as Error | undefined)?.message ||
                'No se pudo guardar el paciente'}
            </p>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">DNI</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3 font-medium">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={6}>
                  Cargando pacientes...
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td className="px-4 py-3 text-rose-600" colSpan={6}>
                  {(patientsError as Error | undefined)?.message || 'No fue posible cargar pacientes'}
                </td>
              </tr>
            )}

            {!isLoading && !isError && patients.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-slate-500" colSpan={6}>
                  No hay pacientes para el criterio de busqueda.
                </td>
              </tr>
            )}

            {patients.map((patient: Patient) => (
              <tr key={patient.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-medium text-slate-900">
                  {patient.first_name} {patient.last_name}
                </td>
                <td className="px-4 py-4 text-slate-600">{patient.dni}</td>
                <td className="px-4 py-4 text-slate-600">{patient.email}</td>
                <td className="px-4 py-4 text-slate-600">{patient.phone}</td>
                <td className="px-4 py-4 text-slate-600">{patient.notes ?? '—'}</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => startEdit(patient)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    type="button"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
