'use client';

import { CONCIERGE_V1 } from '@/config/flags';

/**
 * Cockpit card showing Concierge V1 status (read-only).
 */
export function ConciergeStatusCard() {
    return (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
                    Concierge Engine
                </h3>
                <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${CONCIERGE_V1
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-600/30 text-zinc-400'
                        }`}
                >
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${CONCIERGE_V1 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                    />
                    {CONCIERGE_V1 ? 'Ativo (v1)' : 'Inativo'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-900/40 rounded-lg px-3 py-2">
                    <p className="text-zinc-500 text-xs">Flag</p>
                    <p className="text-zinc-300 font-mono text-xs mt-0.5">
                        NEXT_PUBLIC_CONCIERGE_V1
                    </p>
                </div>
                <div className="bg-zinc-900/40 rounded-lg px-3 py-2">
                    <p className="text-zinc-500 text-xs">Eventos 24h</p>
                    <p className="text-zinc-300 font-medium mt-0.5">N/A</p>
                </div>
            </div>

            <p className="text-xs text-zinc-500 mt-3">
                Motor de decisão determinístico (sem IA). Integração safe-fallback em /cotacao.
            </p>
        </div>
    );
}
