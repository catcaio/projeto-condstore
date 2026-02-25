import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'muted' | 'success' | 'danger' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight',
        variant === 'default' &&
          'border-[hsl(var(--ui-accent-blue)/0.15)] bg-[hsl(var(--ui-accent-blue)/0.12)] text-[hsl(var(--ui-accent-blue-ink))]',
        variant === 'muted' &&
          'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))]',
        variant === 'success' &&
          'border-[hsl(var(--ui-success)/0.20)] bg-[hsl(var(--ui-success)/0.10)] text-[hsl(var(--ui-success-ink))]',
        variant === 'danger' &&
          'border-[hsl(var(--ui-danger)/0.20)] bg-[hsl(var(--ui-danger)/0.10)] text-[hsl(var(--ui-danger-ink))]',
        variant === 'outline' && 'border-[hsl(var(--ui-border))] bg-transparent text-[hsl(var(--ui-text-muted))]',
        className,
      )}
      {...props}
    />
  );
}
