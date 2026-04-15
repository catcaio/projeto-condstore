import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
  noPadding?: boolean;
}

export function Card({
  elevated = false,
  interactive = false,
  noPadding = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-[var(--mvp-radius-md)] border border-[hsl(var(--mvp-border))]',
        elevated
          ? 'bg-[hsl(var(--mvp-surface-2))]'
          : 'bg-[hsl(var(--mvp-surface-1))]',
        interactive
          ? 'cursor-pointer transition-all duration-150 hover:border-[hsl(var(--mvp-border-strong))] hover:shadow-[var(--mvp-shadow-sm)]'
          : '',
        !noPadding ? 'p-5' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'flex items-start justify-between gap-3 pb-4 border-b border-[hsl(var(--mvp-border))]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['pt-4', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'pt-4 mt-4 border-t border-[hsl(var(--mvp-border))] flex items-center gap-2',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
