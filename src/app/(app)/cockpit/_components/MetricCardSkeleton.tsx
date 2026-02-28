/**
 * MetricCardSkeleton — animate-pulse placeholder matching MetricCard dimensions.
 * No spinner. Used during loading state in CockpitMetrics.
 */

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-[hsl(var(--ui-surface))] border-[hsl(var(--ui-border)/0.5)] shadow-sm p-6 flex flex-col gap-3 animate-pulse">
      {/* Title bar */}
      <div className="h-3 w-24 rounded bg-[hsl(var(--ui-muted))]" />
      {/* Value block */}
      <div className="h-8 w-16 rounded bg-[hsl(var(--ui-muted))]" />
      {/* Subtitle bar */}
      <div className="h-2.5 w-32 rounded bg-[hsl(var(--ui-muted))/50]" />
    </div>
  );
}
