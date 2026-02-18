'use client';

import { useState, useEffect } from 'react';

interface MeData {
    userId:   string;
    email:    string | null;
    tenantId: string;
    role:     string | null;
}

export default function Sidebar() {
    const [me, setMe]           = useState<MeData | null>(null);
    const [meError, setMeError] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((r) => {
                if (!r.ok) throw new Error('unauth');
                return r.json() as Promise<MeData>;
            })
            .then(setMe)
            .catch(() => setMeError(true));
    }, []);

    return (
        <aside className="w-64 h-full fixed left-0 top-0 border-r border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-[hsl(var(--cockpit-border))]">
                <span className="text-[hsl(var(--cockpit-accent))] font-bold text-lg tracking-wider uppercase">
                    CondStore
                </span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <div className="px-2 py-2 rounded-md bg-[hsl(var(--cockpit-bg))] text-[hsl(var(--cockpit-text))] border border-[hsl(var(--cockpit-border))] cursor-pointer font-medium text-sm">
                    Dashboard
                </div>
                <div className="px-2 py-2 rounded-md text-[hsl(var(--cockpit-text-muted))] hover:text-[hsl(var(--cockpit-text))] cursor-pointer font-medium text-sm transition-colors">
                    Cotações
                </div>
                <div className="px-2 py-2 rounded-md text-[hsl(var(--cockpit-text-muted))] hover:text-[hsl(var(--cockpit-text))] cursor-pointer font-medium text-sm transition-colors">
                    Pedidos
                </div>
                <div className="px-2 py-2 rounded-md text-[hsl(var(--cockpit-text-muted))] hover:text-[hsl(var(--cockpit-text))] cursor-pointer font-medium text-sm transition-colors">
                    Tenants
                </div>
            </nav>

            <div className="p-4 border-t border-[hsl(var(--cockpit-border))]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--cockpit-border))]" />
                    <div className="flex flex-col overflow-hidden">
                        {meError ? (
                            <span className="text-xs font-medium text-[hsl(var(--cockpit-danger))]">
                                Não autenticado
                            </span>
                        ) : me ? (
                            <>
                                <span className="text-xs font-medium text-[hsl(var(--cockpit-text))] truncate">
                                    {me.email ?? 'Sem email'}
                                </span>
                                <span className="text-[10px] text-[hsl(var(--cockpit-text-muted))] truncate">
                                    tenant: {me.tenantId} &bull; {me.role ?? 'user'}
                                </span>
                            </>
                        ) : (
                            <span className="text-xs text-[hsl(var(--cockpit-text-muted))]">
                                Carregando...
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
