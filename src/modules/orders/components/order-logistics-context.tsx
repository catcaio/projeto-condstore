import Link from 'next/link';
import { Button } from '@/ui/components';
import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { OrderLogisticsContext } from '../types';

function getStatusTone(status: OrderLogisticsContext['logisticsStatus']) {
    if (status === 'com-excecao') {
        return 'critical' as const;
    }
    if (status === 'aguardando-cotacao') {
        return 'warning' as const;
    }
    if (status === 'tracking-ativo') {
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

export function OrderLogisticsContext({ logistics, orderId }: { logistics: OrderLogisticsContext; orderId: string }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Logistica"
                description="Transportadora, modalidade, previsao e excecoes ligadas ao pedido."
                actions={
                    <Link href={`/logistica?pedido=${orderId}`}>
                        <Button variant="secondary" size="sm">Ir para logistica</Button>
                    </Link>
                }
            />
            <div className="mt-4 space-y-3">
                <InfoLine label="Transportadora" value={logistics.carrier} />
                <InfoLine label="Modalidade" value={logistics.mode} />
                <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">Status logistico</p>
                    <div className="mt-2">
                        <StatusChip label={logistics.logisticsStatus} tone={getStatusTone(logistics.logisticsStatus)} />
                    </div>
                </div>
                <InfoLine label="Previsao" value={logistics.forecast} />
                <InfoLine label="Simulacao relacionada" value={logistics.quoteId} />
                {logistics.exception ? <InfoLine label="Excecao" value={logistics.exception} /> : null}
            </div>
        </SurfacePanel>
    );
}
