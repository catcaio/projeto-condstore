export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'accent';

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: {
    bg: 'bg-[hsl(var(--mvp-surface-3))]',
    text: 'text-[hsl(var(--mvp-text-2))]',
    dot: 'bg-[hsl(var(--mvp-text-3))]',
  },
  success: {
    bg: 'bg-[hsl(142_60%_12%)]',
    text: 'text-[hsl(142_80%_52%)]',
    dot: 'bg-[hsl(142_80%_52%)]',
  },
  warning: {
    bg: 'bg-[hsl(40_80%_12%)]',
    text: 'text-[hsl(40_100%_60%)]',
    dot: 'bg-[hsl(40_100%_60%)]',
  },
  danger: {
    bg: 'bg-[hsl(var(--mvp-danger-bg))]',
    text: 'text-[hsl(var(--mvp-danger))]',
    dot: 'bg-[hsl(var(--mvp-danger))]',
  },
  info: {
    bg: 'bg-[hsl(var(--mvp-accent-bg))]',
    text: 'text-[hsl(var(--mvp-accent))]',
    dot: 'bg-[hsl(var(--mvp-accent))]',
  },
  muted: {
    bg: 'bg-transparent border border-[hsl(var(--mvp-border))]',
    text: 'text-[hsl(var(--mvp-text-3))]',
    dot: 'bg-[hsl(var(--mvp-text-3))]',
  },
  accent: {
    bg: 'bg-[hsl(var(--mvp-accent))]',
    text: 'text-[hsl(var(--mvp-color-white))]',
    dot: 'bg-[hsl(var(--mvp-color-white))]',
  },
};

export function Badge({ variant = 'default', dot = false, children, className = '' }: BadgeProps) {
  const v = variantMap[variant];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
        'text-[11px] font-medium tracking-tight whitespace-nowrap',
        v.bg,
        v.text,
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={['w-1.5 h-1.5 rounded-full shrink-0', v.dot].join(' ')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
