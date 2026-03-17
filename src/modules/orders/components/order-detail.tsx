import { EventList, SectionHeader, SimpleDataTable, SurfacePanel } from '@/ui/foundation';
import { OrderStatusTimeline } from './order-status-timeline';
import { OrderSummary } from './order-summary';
import type { OrderRecord } from '../mock-data';

export function OrderDetail({ order }: { order: OrderRecord }) {
    return (
        <div className="flex min-h-[42rem] flex-col gap-6">
            <SurfacePanel>
                <SectionHeader
                    title="Detalhe do pedido"
                    description="Resumo, itens, status e historico recente do pedido em uma unica leitura operacional."
                />
                <div className="mt-4">
                    <OrderSummary order={order} />
                </div>
            </SurfacePanel>

            <SurfacePanel>
                <SectionHeader title="Itens do pedido" description="Produtos, quantidades e subtotal para conferencias operacionais." />
                <div className="mt-4">
                    <SimpleDataTable
                        columns={[
                            { key: 'sku', label: 'SKU' },
                            { key: 'produto', label: 'Produto' },
                            { key: 'quantidade', label: 'Quantidade', align: 'right' },
                            { key: 'subtotal', label: 'Subtotal', align: 'right' },
                        ]}
                        rows={order.items.map((item) => ({
                            sku: item.sku,
                            produto: item.name,
                            quantidade: String(item.quantity),
                            subtotal: item.subtotal,
                        }))}
                    />
                </div>
            </SurfacePanel>

            <SurfacePanel>
                <SectionHeader title="Status timeline" description="Sequencia operacional do pedido com checkpoints claros." />
                <div className="mt-4">
                    <OrderStatusTimeline items={order.timeline} />
                </div>
            </SurfacePanel>

            <SurfacePanel>
                <SectionHeader title="Historico recente" description="Alteracoes, observacoes e eventos operacionais mais recentes." />
                <div className="mt-4">
                    <EventList
                        items={order.events.map((eventItem) => ({
                            title: eventItem.title,
                            time: eventItem.time,
                            detail: eventItem.detail,
                            tone: eventItem.tone,
                            entity: `Pedido #${order.id}`,
                        }))}
                    />
                </div>
            </SurfacePanel>
        </div>
    );
}
