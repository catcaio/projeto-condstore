import Link from 'next/link';
import { Button } from '@/ui/components';
import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { LogisticsRecord } from '../mock-data';

function getStatusTone(label: string) {
    if (label === 'SLA rompido') {
        return 'critical' as const;
    }
    if (label === 'SLA atendido') {
        return 'success' as const;
    }
    return 'info' as const;
}

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

export function LogisticsShippingContext({ item }: { item: LogisticsRecord }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Pedido"
                description="Resumo do pedido e do embarque sem sair da central logistica."
                actions={
                    <Link href={`/pedidos?pedido=${item.order.id}`}>
                        <Button variant="secondary" size="sm">Ir para pedido</Button>
                    </Link>
                }
            />
            <div className="mt-4 space-y-3">
                <InfoLine label="Pedido" value={`#${item.order.id}`} />
                <InfoLine label="Valor" value={item.order.total} />
                <InfoLine label="Status do pedido" value={item.order.status} />
                <InfoLine label="Transportadora" value={item.carrier} />
                <InfoLine label="Modalidade" value={item.mode} />
                <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">SLA / prazo</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <StatusChip label={item.slaLabel} tone={getStatusTone(item.slaLabel)} />
                        <StatusChip label={item.promisedAt} tone="neutral" />
                    </div>
                </div>
            </div>
        </SurfacePanel>
    );
}
