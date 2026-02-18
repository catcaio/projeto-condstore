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
      className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col gap-1 ${
        isError ? 'border-red-200' : 'border-slate-100'
      }`}
    >
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {title}
      </span>
      <span
        className={`text-3xl font-bold ${
          isError ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {value.toLocaleString('pt-BR')}
      </span>
      {subtitle && (
        <span className="text-xs text-slate-500 mt-1">{subtitle}</span>
      )}
    </div>
  );
}
