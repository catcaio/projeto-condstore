'use client';

import { Search, ShieldCheck } from 'lucide-react';
import { Badge, Button } from '@/ui/components';
import { ThemeToggle } from '@/ui/theme';

export default function CommandBar() {
    return (
        <header className="sticky top-3 z-30">
            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/92 px-3 py-2 shadow-[0_16px_48px_-28px_hsl(var(--ui-shadow)/0.7)] backdrop-blur">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-sm font-semibold text-[var(--fg)]">
                                Cockpit
                            </h2>
                            <Badge variant="success" className="hidden sm:inline-flex">
                                Online
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--fg)]/70">
                            Foundation UI (FRONT-01) aplicada ao shell
                        </p>
                    </div>

                    <div className="relative order-3 w-full sm:order-none sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg)]/50" />
                        <input
                            type="text"
                            placeholder="Buscar rota, métrica, evento..."
                            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 pl-9 pr-20 text-sm text-[var(--fg)] placeholder:text-[var(--fg)]/50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--cockpit-accent))]"
                        />
                        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--fg)]/70 sm:inline-block">
                            Ctrl K
                        </kbd>
                    </div>

                    <div className="ml-auto flex items-center gap-1">
                        <Badge variant="muted" className="hidden md:inline-flex">
                            <ShieldCheck className="h-3 w-3" />
                            RBAC
                        </Badge>
                        <ThemeToggle />
                        <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
                            Logs
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
