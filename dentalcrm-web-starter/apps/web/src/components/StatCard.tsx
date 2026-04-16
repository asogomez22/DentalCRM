type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="panel card-lift relative overflow-hidden rounded-[1.75rem] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="font-display mt-4 text-4xl text-slate-950">{value}</p>
      {hint ? <p className="mt-3 max-w-[18rem] text-sm leading-6 text-slate-500">{hint}</p> : null}
    </div>
  );
}
