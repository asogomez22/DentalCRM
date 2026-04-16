import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  createDocument,
  deleteDocument,
  downloadDocument,
  fetchDocuments,
  fetchPatients,
} from '@/shared/api/resources';
import type { PatientDocument } from '@/shared/types/document';

type UploadFormState = {
  patient_id: string;
  category: string;
  file: File | null;
};

const defaultUploadForm = (): UploadFormState => ({
  patient_id: '',
  category: 'general',
  file: null,
});

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES');
}

function getUploaderName(document: PatientDocument) {
  if (document.uploaded_by && typeof document.uploaded_by === 'object') {
    return document.uploaded_by.name;
  }

  return 'Sin usuario';
}

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ patient_id: '', category: '' });
  const [form, setForm] = useState<UploadFormState>(defaultUploadForm);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'documents'],
    queryFn: () => fetchPatients(),
    staleTime: 60_000,
  });

  const {
    data: documents = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['documents', filters.patient_id, filters.category],
    queryFn: () =>
      fetchDocuments({
        patient_id: filters.patient_id ? Number(filters.patient_id) : undefined,
        category: filters.category.trim() || undefined,
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setForm(defaultUploadForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: ({ id, originalName }: { id: number; originalName: string }) => downloadDocument(id, originalName),
  });

  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, item) => sum + item.size_bytes, 0);
    const categories = new Set(documents.map((item) => item.category.toLowerCase()));
    const patientsCount = new Set(documents.map((item) => item.patient_id)).size;

    return {
      count: documents.length,
      totalSize,
      categories: categories.size,
      patients: patientsCount,
    };
  }, [documents]);

  const canSubmit = Number(form.patient_id) > 0 && form.category.trim().length > 0 && Boolean(form.file);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !form.file) {
      return;
    }

    const payload = new FormData();
    payload.append('patient_id', form.patient_id);
    payload.append('category', form.category.trim());
    payload.append('file', form.file);

    uploadMutation.mutate(payload);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((previous) => ({
      ...previous,
      file: event.target.files?.[0] ?? null,
    }));
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand)]">Expediente digital</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Documentos</h2>
        <p className="mt-2 text-sm text-slate-500">
          Guarda consentimientos, presupuestos, radiografias y cualquier archivo del paciente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documentos" value={String(stats.count)} hint="Archivos visibles con el filtro actual" />
        <StatCard label="Tamano total" value={formatBytes(stats.totalSize)} hint="Espacio ocupado" />
        <StatCard label="Categorias" value={String(stats.categories)} hint="Tipos de documento" />
        <StatCard label="Pacientes" value={String(stats.patients)} hint="Pacientes con archivos" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Subir archivo</h3>
          <p className="mt-1 text-sm text-slate-500">Sube el archivo y asignalo al paciente correspondiente.</p>

          <div className="mt-5 space-y-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Paciente</span>
              <select
                value={form.patient_id}
                onChange={(event) => setForm((previous) => ({ ...previous, patient_id: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">Selecciona paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Categoria</span>
              <input
                value={form.category}
                onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                placeholder="Ej. consentimiento, presupuesto, radiografia"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-600">Archivo</span>
              <input
                type="file"
                onChange={onFileChange}
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </label>

            {form.file && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{form.file.name}</p>
                <p>{formatBytes(form.file.size)}</p>
              </div>
            )}
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={!canSubmit || uploadMutation.isPending}
              className="rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300"
            >
              {uploadMutation.isPending ? 'Subiendo...' : 'Guardar documento'}
            </button>
          </div>

          {uploadMutation.isError && (
            <p className="mt-3 text-sm text-rose-600">
              {(uploadMutation.error as Error | undefined)?.message || 'No se pudo subir el documento'}
            </p>
          )}
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Repositorio</h3>
              <p className="mt-1 text-sm text-slate-500">Busca por paciente o tipo de documento.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={filters.patient_id}
                onChange={(event) => setFilters((previous) => ({ ...previous, patient_id: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              >
                <option value="">Todos los pacientes</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>

              <input
                value={filters.category}
                onChange={(event) => setFilters((previous) => ({ ...previous, category: event.target.value }))}
                placeholder="Filtrar por categoria"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Cargando documentos...</p>}
            {isError && (
              <p className="text-sm text-rose-600">
                {(error as Error | undefined)?.message || 'No se pudieron cargar los documentos'}
              </p>
            )}
            {!isLoading && !isError && documents.length === 0 && (
              <p className="text-sm text-slate-500">No hay documentos para el filtro seleccionado.</p>
            )}

            {documents.map((document) => (
              <div key={document.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{document.original_name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {document.patient?.first_name} {document.patient?.last_name} - {document.category}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatBytes(document.size_bytes)} - {document.mime_type}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Subido por {getUploaderName(document)} el {formatDate(document.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadMutation.mutate({ id: document.id, originalName: document.original_name })}
                      disabled={downloadMutation.isPending}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Descargar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(document.id)}
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
