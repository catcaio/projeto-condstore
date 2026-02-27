import * as React from 'react';
import { cn } from '@/lib/utils';

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px bg-[var(--color-border)]', className)} role="separator" {...props} />;
}

export function ListGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-bg-surface)]',
        className,
      )}
      {...props}
    />
  );
}

interface ListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: 'button' | 'div';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  inset?: boolean;
  active?: boolean;
}

export function ListItem({
  as = 'div',
  leading,
  trailing,
  inset = false,
  active = false,
  className,
  children,
  ...props
}: ListItemProps) {
  const baseClassName = cn(
    'flex min-h-12 items-center gap-3 px-4 py-2 text-sm text-[var(--color-text-primary)]',
    inset && 'pl-10',
    active && 'bg-[hsl(var(--ui-accent-blue)/0.10)]',
    as === 'button' && 'w-full text-left transition-colors hover:bg-[hsl(var(--ui-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-inset',
    className,
  );

  if (as === 'button') {
    return (
      <button className={baseClassName} {...props}>
        {leading ? <span className="shrink-0 text-[var(--color-text-secondary)]">{leading}</span> : null}
        <span className="min-w-0 flex-1">{children}</span>
        {trailing ? <span className="shrink-0 text-[var(--color-text-secondary)]">{trailing}</span> : null}
      </button>
    );
  }

  return (
    <div className={baseClassName}>
      {leading ? <span className="shrink-0 text-[var(--color-text-secondary)]">{leading}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing ? <span className="shrink-0 text-[var(--color-text-secondary)]">{trailing}</span> : null}
    </div>
  );
}
