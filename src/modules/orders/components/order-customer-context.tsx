import Link from 'next/link';
import { Button } from '@/ui/components';
import { SectionHeader, SurfacePanel } from '@/ui/foundation';
import { ClientTags } from '@/modules/clientes/components/client-tags';
import type { OrderRecord } from '../mock-data';

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

export function OrderCustomerContext({ order }: { order: OrderRecord }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Cliente"
                description="Resumo rapido da conta para decidir sem sair do fluxo do pedido."
                actions={
                    <Link href={`/clientes?cliente=${order.customer.id}`}>
                        <Button variant="secondary" size="sm">Abrir cliente</Button>
                    </Link>
                }
            />
            <div className="mt-4 space-y-3">
                <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{order.customer.company}</p>
                    <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{order.customer.summary}</p>
                    <div className="mt-3">
                        <ClientTags tags={order.customer.tags} />
                    </div>
                </div>
                <InfoLine label="Contato" value={order.customer.contact} />
                <InfoLine label="Cidade" value={order.customer.city} />
                <InfoLine label="Conversas" value={`${order.customer.conversationCount} conversas monitoradas`} />
                <InfoLine label="Simulacoes" value={`${order.customer.simulationCount} cotacoes recentes`} />
            </div>
        </SurfacePanel>
    );
}
