import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[hsl(var(--mvp-accent))] text-white hover:bg-[hsl(var(--mvp-accent-hover))] focus-visible:ring-[hsl(var(--mvp-accent))/40]',
  secondary:
    'bg-[hsl(var(--mvp-surface-2))] text-[hsl(var(--mvp-text-1))] border border-[hsl(var(--mvp-border))] hover:bg-[hsl(var(--mvp-surface-3))] focus-visible:ring-[hsl(var(--mvp-border))]',
  ghost:
    'bg-transparent text-[hsl(var(--mvp-text-2))] hover:bg-[hsl(var(--mvp-surface-2))] hover:text-[hsl(var(--mvp-text-1))] focus-visible:ring-[hsl(var(--mvp-border))]',
  danger:
    'bg-[hsl(var(--mvp-danger))] text-white hover:opacity-90 focus-visible:ring-[hsl(var(--mvp-danger))/40]',
  outline:
    'bg-transparent text-[hsl(var(--mvp-text-1))] border border-[hsl(var(--mvp-border-strong))] hover:bg-[hsl(var(--mvp-surface-2))] focus-visible:ring-[hsl(var(--mvp-border))]',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-[15px] gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center font-medium rounded-[var(--mvp-radius-sm)]',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--mvp-bg))]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {loading && (
        <span
          className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
