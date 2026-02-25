import * as React from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'grouped' | 'elevated' | 'plain';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  inset?: boolean;
}

export function Card({
  className,
  variant = 'grouped',
  inset = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[1.2rem] border border-[hsl(var(--ui-border)/0.9)] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))]',
        variant === 'elevated' && 'shadow-[0_16px_50px_-24px_hsl(var(--ui-shadow)/0.55)]',
        variant === 'plain' && 'shadow-none',
        inset && 'p-1',
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
  subheading?: React.ReactNode;
  actions?: React.ReactNode;
}

export function CardHeader({ className, heading, subheading, actions, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 py-3', className)} {...props}>
      <div className="min-w-0">
        {heading ? <div className="text-sm font-semibold tracking-tight text-[hsl(var(--ui-text))]">{heading}</div> : null}
        {subheading ? (
          <div className="mt-0.5 text-xs text-[hsl(var(--ui-text-muted))]">{subheading}</div>
        ) : null}
        {children}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 pb-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-2 px-4 py-3', className)} {...props} />;
}
