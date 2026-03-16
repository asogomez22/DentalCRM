type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="panel card-lift relative overflow-hidden rounded-[1.75rem] p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(15,118,110,0.95),rgba(245,158,11,0.72))]" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="font-display mt-4 text-4xl text-slate-950">{value}</p>
      {hint ? <p className="mt-3 max-w-[18rem] text-sm leading-6 text-slate-500">{hint}</p> : null}
    </div>
  );
}
