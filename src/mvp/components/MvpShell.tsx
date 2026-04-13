import type { ReactNode } from 'react';

interface MvpShellProps {
  children: ReactNode;
}

/**
 * Minimal layout wrapper used exclusively within the /mvp route group.
 * Intentionally lightweight — no dependency on the main app shell.
 */
export function MvpShell({ children }: MvpShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-2">
        <span className="font-semibold text-foreground text-sm tracking-tight">
          LojaCond
        </span>
        <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
          MVP
        </span>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
