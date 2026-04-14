import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center',
        className,
      ].join(' ')}
      role="status"
    >
      {icon && (
        <div className="w-12 h-12 rounded-[var(--mvp-radius-md)] bg-[hsl(var(--mvp-surface-2))] flex items-center justify-center text-[hsl(var(--mvp-text-3))]">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-semibold text-[hsl(var(--mvp-text-2))]">{title}</p>
        {description && (
          <p className="text-sm text-[hsl(var(--mvp-text-3))] leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
