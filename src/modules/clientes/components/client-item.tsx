import { StatusChip } from '@/ui/foundation';
import type { ClientRecord, ClientStatus } from '../mock-data';

function getStatusTone(status: ClientStatus) {
    if (status === 'vip') {
        return 'success' as const;
    }
    if (status === 'em-risco') {
        return 'critical' as const;
    }
    if (status === 'monitorado') {
        return 'warning' as const;
    }
    return 'info' as const;
}

export function ClientItem({
    client,
    selected,
    onSelect,
}: {
    client: ClientRecord;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full rounded-[1.25rem] border p-4 text-left transition-colors ${selected ? 'border-[hsl(var(--ui-accent-blue)/0.24)] bg-[hsl(var(--ui-accent-blue)/0.08)]' : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface))]'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[hsl(var(--ui-text))]">{client.company}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        {client.segment}
                    </p>
                </div>
                <StatusChip label={client.status} tone={getStatusTone(client.status)} />
            </div>

            <p className="mt-3 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{client.name}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[0.9rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Pedidos</p>
                    <p className="mt-1 text-sm font-semibold text-[hsl(var(--ui-text))]">{client.orderCount}</p>
                </div>
                <div className="rounded-[0.9rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Conversas</p>
                    <p className="mt-1 text-sm font-semibold text-[hsl(var(--ui-text))]">{client.conversationCount}</p>
                </div>
                <div className="rounded-[0.9rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-2 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">Fretes</p>
                    <p className="mt-1 text-sm font-semibold text-[hsl(var(--ui-text))]">{client.simulationCount}</p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                <span>{client.lastActivity}</span>
                <span>{client.city}</span>
            </div>
        </button>
    );
}
