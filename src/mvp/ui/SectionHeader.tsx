import type { ReactNode } from 'react';

export interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  label,
  title,
  description,
  actions,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={['flex items-start justify-between gap-4', className].join(' ')}>
      <div className="space-y-0.5 min-w-0">
        {label && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--mvp-text-3))] mb-1">
            {label}
          </p>
        )}
        <h2 className="text-base font-semibold text-[hsl(var(--mvp-text-1))] leading-tight truncate">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-[hsl(var(--mvp-text-3))] leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
