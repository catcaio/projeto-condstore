/**
 * MetricCard — presentational metric card for the Cockpit dashboard.
 * No hooks, no side effects. Renders inside a client component boundary.
 *
 * colorVariant='error' applies a red accent only when value > 0.
 */

export type MetricCardVariant = 'default' | 'error';

export interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  colorVariant?: MetricCardVariant;
}

export function MetricCard({
  title,
  value,
  subtitle,
  colorVariant = 'default',
}: MetricCardProps) {
  const isError = colorVariant === 'error' && value > 0;

  return (
    <div
      className={`rounded-2xl border bg-[hsl(var(--ui-surface))] p-6 flex flex-col gap-1 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isError ? 'border-red-500/30' : 'border-[hsl(var(--ui-border)/0.5)]'
        }`}
    >
      <span className="text-xs font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">
        {title}
      </span>
      <span
        className={`text-3xl font-bold tracking-tight ${isError ? 'text-red-500' : 'text-[hsl(var(--ui-text))]'
          }`}
      >
        {value.toLocaleString('pt-BR')}
      </span>
      {subtitle && (
        <span className="text-xs text-[hsl(var(--ui-text-muted))]/80 mt-1">{subtitle}</span>
      )}
    </div>
  );
}
