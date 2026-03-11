import { StatusChip } from '@/ui/foundation';
import { ClientTags } from './client-tags';
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

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

export function ClientSummary({ client }: { client: ClientRecord }) {
    return (
        <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                        Cliente 360
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[hsl(var(--ui-text))]">
                        {client.company}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{client.summary}</p>
                </div>
                <StatusChip label={client.status} tone={getStatusTone(client.status)} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCell label="Nome" value={client.name} />
                <InfoCell label="Contato" value={client.contact} />
                <InfoCell label="Email" value={client.email} />
                <InfoCell label="Cidade" value={client.city} />
            </div>

            <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">Tags</p>
                <div className="mt-3">
                    <ClientTags tags={client.tags} />
                </div>
            </div>
        </div>
    );
}
