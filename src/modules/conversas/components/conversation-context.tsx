import Link from 'next/link';
import { Button } from '@/ui/components';
import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { ConversationOrder, ConversationRecord, ConversationSimulation } from '../mock-data';

function getSimulationTone(status: ConversationSimulation['status']) {
    if (status === 'contingencia') {
        return 'warning' as const;
    }
    if (status === 'aprovada') {
        return 'success' as const;
    }
    return 'info' as const;
}

function getOrderTone(status: ConversationOrder['status']) {
    if (status === 'aguardando-aprovacao') {
        return 'warning' as const;
    }
    if (status === 'coleta') {
        return 'info' as const;
    }
    if (status === 'entregue') {
        return 'success' as const;
    }
    return 'neutral' as const;
}

function ContextLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{label}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{value}</p>
        </div>
    );
}

export function ConversationContext({ conversation }: { conversation: ConversationRecord }) {
    return (
        <SurfacePanel className="flex h-full min-h-[42rem] flex-col">
            <SectionHeader
                title="Contexto operacional"
                description="Cliente, simulacoes, pedidos e intencao detectada no mesmo painel lateral."
            />

            <div className="mt-4 space-y-4 overflow-y-auto pr-1">
                <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        Resumo do cliente
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">
                        {conversation.context.customerSummary}
                    </p>
                    <div className="mt-4 grid gap-3">
                        <ContextLine label="Saude da conta" value={conversation.context.accountHealth} />
                        <ContextLine label="Regiao" value={conversation.context.region} />
                        <ContextLine label="Owner" value={conversation.owner} />
                    </div>
                </div>

                <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                            Intencao detectada
                        </p>
                        <StatusChip label={conversation.context.detectedIntent} tone="info" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {conversation.context.tags.map((tag) => (
                            <StatusChip key={tag} label={tag} tone="neutral" />
                        ))}
                    </div>
                </div>

                <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        Ultimas simulacoes
                    </p>
                    <div className="mt-3 space-y-3">
                        {conversation.context.recentSimulations.map((simulation) => (
                            <div key={simulation.id} className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{simulation.id}</p>
                                        <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">
                                            {simulation.route} • {simulation.carrier}
                                        </p>
                                    </div>
                                    <StatusChip label={simulation.status} tone={getSimulationTone(simulation.status)} />
                                </div>
                                <p className="mt-3 text-sm font-medium text-[hsl(var(--ui-text))]">{simulation.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[1.25rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">
                        Pedidos recentes
                    </p>
                    <div className="mt-3 space-y-3">
                        {conversation.context.recentOrders.map((order) => (
                            <div key={order.id} className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Pedido #{order.id}</p>
                                        <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{order.stage}</p>
                                    </div>
                                    <StatusChip label={order.status} tone={getOrderTone(order.status)} />
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[hsl(var(--ui-text-muted))]">
                                    <span>{order.promise}</span>
                                    <span className="font-medium text-[hsl(var(--ui-text))]">{order.total}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[hsl(var(--ui-border))] pt-4">
                <Link href={`/clientes?cliente=${conversation.relatedClientId}`}>
                    <Button variant="secondary" size="sm">Abrir cliente</Button>
                </Link>
                <Link href={`/logistica/simulador?pedido=${conversation.relatedOrderId}`}>
                    <Button variant="secondary" size="sm">Nova simulacao</Button>
                </Link>
                <Link href={`/pedidos?pedido=${conversation.relatedOrderId}`}>
                    <Button size="sm">Ver pedidos</Button>
                </Link>
            </div>
        </SurfacePanel>
    );
}
