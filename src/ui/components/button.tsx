import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] border text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' &&
        'border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-[hsl(var(--ui-accent-blue-strong))] hover:border-[hsl(var(--ui-accent-blue-strong))]',
        variant === 'secondary' &&
        'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-muted))]',
        variant === 'ghost' &&
        'border-transparent bg-transparent text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-muted))] hover:text-[hsl(var(--ui-text))]',
        variant === 'danger' &&
        'border-[hsl(var(--ui-danger))] bg-[hsl(var(--ui-danger))] text-white hover:bg-[hsl(var(--ui-danger-strong))] hover:border-[hsl(var(--ui-danger-strong))]',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-11 px-5',
        size === 'icon' && 'h-10 w-10 p-0',
        className,
      )}
      {...props}
    />
  );
});
