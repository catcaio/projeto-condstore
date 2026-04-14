import type { ReactNode } from 'react';

export type FeedbackType = 'loading' | 'success' | 'error' | 'warning' | 'info';

export interface FeedbackStateProps {
  type: FeedbackType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const feedbackConfig: Record<
  FeedbackType,
  { icon: ReactNode; bg: string; text: string; border: string }
> = {
  loading: {
    icon: (
      <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
    ),
    bg: 'bg-[hsl(var(--mvp-surface-2))]',
    text: 'text-[hsl(var(--mvp-text-2))]',
    border: 'border-[hsl(var(--mvp-border))]',
  },
  success: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 10.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bg: 'bg-[hsl(142_60%_8%)]',
    text: 'text-[hsl(142_80%_52%)]',
    border: 'border-[hsl(142_60%_16%)]',
  },
  error: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v5M10 14v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    bg: 'bg-[hsl(var(--mvp-danger-bg))]',
    text: 'text-[hsl(var(--mvp-danger))]',
    border: 'border-[hsl(var(--mvp-danger-border))]',
  },
  warning: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 2L18 17H2L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 8v4M10 14v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    bg: 'bg-[hsl(40_80%_8%)]',
    text: 'text-[hsl(40_100%_60%)]',
    border: 'border-[hsl(40_80%_16%)]',
  },
  info: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9v5M10 6v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    bg: 'bg-[hsl(var(--mvp-accent-bg))]',
    text: 'text-[hsl(var(--mvp-accent))]',
    border: 'border-[hsl(var(--mvp-accent-border))]',
  },
};

export function FeedbackState({
  type,
  title,
  description,
  action,
  className = '',
}: FeedbackStateProps) {
  const config = feedbackConfig[type];
  const role = type === 'error' ? 'alert' : type === 'loading' ? 'status' : 'status';

  return (
    <div
      role={role}
      aria-live={type === 'loading' ? 'polite' : 'assertive'}
      className={[
        'flex flex-col items-center justify-center gap-3 py-12 px-6 text-center',
        'rounded-[var(--mvp-radius-md)] border',
        config.bg,
        config.text,
        config.border,
        className,
      ].join(' ')}
    >
      <div className="text-current">{config.icon}</div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-sm opacity-80 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
