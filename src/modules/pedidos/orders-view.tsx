'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseOrdersQueryState } from '@/modules/navigation/query-state';
import { resolvePreferredItem } from '@/modules/navigation/selection-utils';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip } from '@/ui/foundation';
import { OrderActions } from './components/order-actions';
import { OrderCustomerContext } from './components/order-customer-context';
import { OrderDetail } from './components/order-detail';
import { OrderLogisticsContext } from './components/order-logistics-context';
import { OrdersList } from './components/orders-list';
import { mockOrders, type OrderChannel, type OrderPeriodBucket, type OrderPriority, type OrderStatus } from './mock-data';

type StatusFilter = OrderStatus | 'todos';
type PriorityFilter = OrderPriority | 'todas';
type ChannelFilter = OrderChannel | 'todos';
type PeriodFilter = OrderPeriodBucket | 'todos';

const ownerOptions = Array.from(new Set(mockOrders.map((order) => order.owner)));

export function OrdersView() {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(() => parseOrdersQueryState(searchParams), [querySignature, searchParams]);
    const [selectedOrderId, setSelectedOrderId] = useState(mockOrders[0]?.id ?? '');
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('todos');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
    const [ownerFilter, setOwnerFilter] = useState('todos');

    const deferredSearch = useDeferredValue(searchValue);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todos');
        setPriorityFilter(routeContext.priority ?? 'todas');
        setChannelFilter(routeContext.channel ?? 'todos');
        setPeriodFilter('todos');
        setOwnerFilter('todos');
    }, [querySignature, routeContext.channel, routeContext.priority, routeContext.status]);

    const filteredOrders = mockOrders.filter((order) => {
        const searchMatches =
            deferredSearch.trim().length === 0 ||
            [
                order.id,
                order.customer.company,
                order.customer.name,
                order.owner,
                order.origin,
                order.logistics.carrier,
            ]
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch.toLowerCase());

        const statusMatches = statusFilter === 'todos' || order.status === statusFilter;
        const priorityMatches = priorityFilter === 'todas' || order.priority === priorityFilter;
        const channelMatches = channelFilter === 'todos' || order.channel === channelFilter;
        const periodMatches = periodFilter === 'todos' || order.periodBucket === periodFilter;
        const ownerMatches = ownerFilter === 'todos' || order.owner === ownerFilter;
        const clientMatches = !routeContext.clientId || order.customer.id === routeContext.clientId;

        return searchMatches && statusMatches && priorityMatches && channelMatches && periodMatches && ownerMatches && clientMatches;
    });

    useEffect(() => {
        if (!routeContext.orderId && !routeContext.clientId && !routeContext.status && !routeContext.channel && !routeContext.priority) {
            return;
        }

        const nextSelected = resolvePreferredItem({
            items: filteredOrders,
            explicitId: routeContext.orderId,
            getId: (order) => order.id,
            preferredPredicates: routeContext.clientId ? [(order) => order.customer.id === routeContext.clientId] : [],
        });

        if (nextSelected?.id) {
            setSelectedOrderId(nextSelected.id);
        }
    }, [
        filteredOrders,
        querySignature,
        routeContext.channel,
        routeContext.clientId,
        routeContext.orderId,
        routeContext.priority,
        routeContext.status,
    ]);

    const selectedOrder =
        resolvePreferredItem({
            items: filteredOrders,
            allItems: mockOrders,
            explicitId: selectedOrderId,
            getId: (order) => order.id,
        }) ?? mockOrders[0];

    const routeOrder = routeContext.orderId
        ? mockOrders.find((order) => order.id === routeContext.orderId)
        : undefined;
    const routeClient = routeContext.clientId
        ? mockOrders.find((order) => order.customer.id === routeContext.clientId)?.customer
        : undefined;

    function handleSelectOrder(orderId: string) {
        startTransition(() => {
            setSelectedOrderId(orderId);
        });
    }

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Pedidos"
                title="Fluxo operacional canonico de pedidos"
                description="Triagem, detalhe e contexto operacional do pedido em uma unica mesa de execucao entre comercial, atendimento e logistica."
                meta={
                    <>
                        <StatusChip label="30 pedidos mock" tone="info" />
                        <StatusChip label="triagem operacional" tone="success" />
                        <StatusChip label="ponte com logistica" tone="warning" />
                        {routeOrder ? <StatusChip label={`pedido #${routeOrder.id}`} tone="warning" /> : null}
                        {routeClient ? <StatusChip label={`cliente ${routeClient.company}`} tone="neutral" /> : null}
                    </>
                }
                actions={
                    <>
                        <Link href="/clientes">
                            <Button variant="secondary">Abrir clientes</Button>
                        </Link>
                        <Link href="/logistica">
                            <Button>Ir para logistica</Button>
                        </Link>
                    </>
                }
            />

            <ModuleNav
                items={[
                    { label: 'Fila', current: true, detail: 'Busca, status e aging' },
                    { label: 'Detalhe', detail: 'Resumo, itens e timeline' },
                    { label: 'Contexto', detail: 'Cliente e logistica lado a lado' },
                    { label: 'Acoes', detail: 'Atalhos para destravar a operacao' },
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)_22rem]">
                <OrdersList
                    orders={filteredOrders}
                    totalCount={mockOrders.length}
                    selectedOrderId={selectedOrder.id}
                    searchValue={searchValue}
                    statusFilter={statusFilter}
                    priorityFilter={priorityFilter}
                    channelFilter={channelFilter}
                    periodFilter={periodFilter}
                    ownerFilter={ownerFilter}
                    owners={ownerOptions}
                    onSearchChange={setSearchValue}
                    onStatusFilterChange={setStatusFilter}
                    onPriorityFilterChange={setPriorityFilter}
                    onChannelFilterChange={setChannelFilter}
                    onPeriodFilterChange={setPeriodFilter}
                    onOwnerFilterChange={setOwnerFilter}
                    onSelectOrder={handleSelectOrder}
                />

                <OrderDetail order={selectedOrder} />

                <ShellContainer>
                    <OrderCustomerContext order={selectedOrder} />
                    <OrderLogisticsContext logistics={selectedOrder.logistics} orderId={selectedOrder.id} />
                    <OrderActions order={selectedOrder} />
                </ShellContainer>
            </div>
        </ShellContainer>
    );
}
