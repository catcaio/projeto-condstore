/**
 * MetricCardSkeleton — animate-pulse placeholder matching MetricCard dimensions.
 * No spinner. Used during loading state in CockpitMetrics.
 */

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3 animate-pulse">
      {/* Title bar */}
      <div className="h-3 w-24 rounded bg-slate-200" />
      {/* Value block */}
      <div className="h-8 w-16 rounded bg-slate-200" />
      {/* Subtitle bar */}
      <div className="h-2.5 w-32 rounded bg-slate-100" />
    </div>
  );
}
