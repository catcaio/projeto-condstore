import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EmptyState, SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { CockpitShortcut } from '../data/shared';
import { cockpitShortcuts } from '../mock-data';

export function CockpitActionGrid({ shortcuts = cockpitShortcuts }: { shortcuts?: CockpitShortcut[] }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Atalhos operacionais"
                description="Acoes rapidas para o operador sair do cockpit e atuar sem navegar por telas redundantes."
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {shortcuts.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-4">
                        <EmptyState
                            title="Sem atalhos disponiveis"
                            description="Nao ha acoes rapidas configuradas para este contexto."
                        />
                    </div>
                ) : (
                    shortcuts.map((shortcut) => (
                        <Link
                            key={shortcut.id}
                            href={shortcut.href}
                            className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4 transition-colors hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface))]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{shortcut.label}</p>
                                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{shortcut.description}</p>
                                </div>
                                <ArrowUpRight className="mt-1 h-4 w-4 text-[hsl(var(--ui-text-subtle))]" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </SurfacePanel>
    );
}
