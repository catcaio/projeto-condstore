import { EmptyState, SectionHeader, SurfacePanel, StatusChip } from '@/ui/foundation';
import { OrderFilters } from './order-filters';
import { OrderItem } from './order-item';
import type { OrderChannel, OrderPeriodBucket, OrderPriority, OrderRecord, OrderStatus } from '../mock-data';

type StatusFilter = OrderStatus | 'todos';
type PriorityFilter = OrderPriority | 'todas';
type ChannelFilter = OrderChannel | 'todos';
type PeriodFilter = OrderPeriodBucket | 'todos';

export function OrdersList({
    orders,
    totalCount,
    selectedOrderId,
    searchValue,
    statusFilter,
    priorityFilter,
    channelFilter,
    periodFilter,
    ownerFilter,
    owners,
    onSearchChange,
    onStatusFilterChange,
    onPriorityFilterChange,
    onChannelFilterChange,
    onPeriodFilterChange,
    onOwnerFilterChange,
    onSelectOrder,
}: {
    orders: OrderRecord[];
    totalCount: number;
    selectedOrderId: string;
    searchValue: string;
    statusFilter: StatusFilter;
    priorityFilter: PriorityFilter;
    channelFilter: ChannelFilter;
    periodFilter: PeriodFilter;
    ownerFilter: string;
    owners: string[];
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: StatusFilter) => void;
    onPriorityFilterChange: (value: PriorityFilter) => void;
    onChannelFilterChange: (value: ChannelFilter) => void;
    onPeriodFilterChange: (value: PeriodFilter) => void;
    onOwnerFilterChange: (value: string) => void;
    onSelectOrder: (orderId: string) => void;
}) {
    return (
        <SurfacePanel className="flex h-full min-h-[42rem] flex-col">
            <SectionHeader
                title="Lista de pedidos"
                description="Fila operacional para triagem, aging e handoff entre comercial e logistica."
                actions={<StatusChip label={`${orders.length}/${totalCount} visiveis`} tone="info" />}
            />

            <div className="mt-4">
                <OrderFilters
                    searchValue={searchValue}
                    statusFilter={statusFilter}
                    priorityFilter={priorityFilter}
                    channelFilter={channelFilter}
                    periodFilter={periodFilter}
                    ownerFilter={ownerFilter}
                    owners={owners}
                    onSearchChange={onSearchChange}
                    onStatusFilterChange={onStatusFilterChange}
                    onPriorityFilterChange={onPriorityFilterChange}
                    onChannelFilterChange={onChannelFilterChange}
                    onPeriodFilterChange={onPeriodFilterChange}
                    onOwnerFilterChange={onOwnerFilterChange}
                />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {orders.length === 0 ? (
                    <EmptyState
                        title="Nenhum pedido encontrado"
                        description="Ajuste filtros ou busca para recuperar uma fila operacional relevante."
                    />
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <OrderItem
                                key={order.id}
                                order={order}
                                selected={order.id === selectedOrderId}
                                onSelect={() => onSelectOrder(order.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </SurfacePanel>
    );
}
