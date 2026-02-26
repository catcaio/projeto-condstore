import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
  muted?: boolean;
  disabled?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}

export function NavItem({
  href,
  label,
  icon: Icon,
  active = false,
  muted = false,
  disabled = false,
  trailing,
  className,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-inset',
        active
          ? 'bg-[hsl(var(--ui-accent-blue)/0.12)] text-[hsl(var(--ui-accent-blue-ink))]'
          : 'text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-muted))]',
        muted && !active && 'text-[hsl(var(--ui-text-muted))]',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
      aria-current={active ? 'page' : undefined}
    >
      {Icon ? (
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            active ? 'text-[hsl(var(--ui-accent-blue))]' : 'text-[hsl(var(--ui-text-muted))]',
          )}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {trailing ? (
        <span className="shrink-0 text-[hsl(var(--ui-text-muted))]">{trailing}</span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--ui-text-subtle))] opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Link>
  );
}
