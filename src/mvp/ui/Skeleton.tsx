import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: string;
  width?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedMap = {
  sm: 'rounded-[var(--mvp-radius-xs)]',
  md: 'rounded-[var(--mvp-radius-sm)]',
  lg: 'rounded-[var(--mvp-radius-md)]',
  full: 'rounded-full',
};

export function Skeleton({
  height = '1rem',
  width = '100%',
  rounded = 'sm',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'animate-pulse bg-[hsl(var(--mvp-surface-3))]',
        roundedMap[rounded],
        className,
      ].join(' ')}
      style={{ height, width, ...style }}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={['space-y-2', className].join(' ')} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'rounded-[var(--mvp-radius-md)] border border-[hsl(var(--mvp-border))]',
        'bg-[hsl(var(--mvp-surface-1))] p-5 space-y-3',
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton height="2rem" width="2rem" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton height="0.75rem" width="40%" />
          <Skeleton height="0.625rem" width="60%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}
