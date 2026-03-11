'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseLogisticsQueryState } from '@/modules/navigation/query-state';
import { resolvePreferredItem } from '@/modules/navigation/selection-utils';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip } from '@/ui/foundation';
import { LogisticsActions } from './components/logistics-actions';
import { LogisticsCustomerContext } from './components/logistics-customer-context';
import { LogisticsDetail } from './components/logistics-detail';
import { LogisticsList } from './components/logistics-list';
import { LogisticsShippingContext } from './components/logistics-shipping-context';
import { mockLogistics, type LogisticsPeriodBucket, type LogisticsPriority, type LogisticsStatus } from './mock-data';

type StatusFilter = LogisticsStatus | 'todos';
type PriorityFilter = LogisticsPriority | 'todas';
type PeriodFilter = LogisticsPeriodBucket | 'todos';

const carrierOptions = Array.from(new Set(mockLogistics.map((item) => item.carrier)));

export function LogisticsView() {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(
        () => parseLogisticsQueryState(searchParams, { carriers: carrierOptions }),
        [querySignature, searchParams]
    );
    const [selectedId, setSelectedId] = useState(mockLogistics[0]?.id ?? '');
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
    const [exceptionFilter, setExceptionFilter] = useState('todas');
    const [carrierFilter, setCarrierFilter] = useState('todas');
    const [regionFilter, setRegionFilter] = useState('todas');
    const [deadlineFilter, setDeadlineFilter] = useState('todos');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');

    const deferredSearch = useDeferredValue(searchValue);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todos');
        setExceptionFilter(routeContext.exception ?? 'todas');
        setCarrierFilter(routeContext.carrier ?? 'todas');
        setRegionFilter('todas');
        setDeadlineFilter('todos');
        setPriorityFilter('todas');
        setPeriodFilter('todos');
    }, [querySignature, routeContext.carrier, routeContext.exception, routeContext.status]);

    const filteredItems = mockLogistics.filter((item) => {
        const searchMatches =
            deferredSearch.trim().length === 0 ||
            [
                item.id,
                item.reference,
                item.order.id,
                item.order.customer.company,
                item.carrier,
                item.destination,
            ]
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch.toLowerCase());

        const statusMatches = statusFilter === 'todos' || item.status === statusFilter;
        const exceptionMatches =
            exceptionFilter === 'todas' ||
            (exceptionFilter === 'com-excecao' ? item.hasException : !item.hasException);
        const carrierMatches = carrierFilter === 'todas' || item.carrier === carrierFilter;
        const regionMatches = regionFilter === 'todas' || item.region === regionFilter;
        const deadlineMatches =
            deadlineFilter === 'todos' ||
            (deadlineFilter === 'janela' ? item.slaLabel === 'Dentro da janela' : deadlineFilter === 'rompido' ? item.slaLabel === 'SLA rompido' : item.slaLabel === 'SLA atendido');
        const priorityMatches = priorityFilter === 'todas' || item.priority === priorityFilter;
        const periodMatches = periodFilter === 'todos' || item.periodBucket === periodFilter;
        const orderMatches = !routeContext.orderId || item.order.id === routeContext.orderId;
        const clientMatches = !routeContext.clientId || item.order.customer.id === routeContext.clientId;

        return searchMatches && statusMatches && exceptionMatches && carrierMatches && regionMatches && deadlineMatches && priorityMatches && periodMatches && orderMatches && clientMatches;
    });

    useEffect(() => {
        if (
            !routeContext.logisticsId &&
            !routeContext.orderId &&
            !routeContext.clientId &&
            !routeContext.status &&
            !routeContext.exception &&
            !routeContext.carrier
        ) {
            return;
        }

        const preferredPredicates: Array<(item: (typeof mockLogistics)[number]) => boolean> = [];
        if (routeContext.orderId) {
            preferredPredicates.push((item: (typeof mockLogistics)[number]) => item.order.id === routeContext.orderId);
        }
        if (routeContext.clientId) {
            preferredPredicates.push((item: (typeof mockLogistics)[number]) => item.order.customer.id === routeContext.clientId);
        }

        const nextSelected = resolvePreferredItem({
            items: filteredItems,
            explicitId: routeContext.logisticsId,
            getId: (item) => item.id,
            preferredPredicates,
        });

        if (nextSelected?.id) {
            setSelectedId(nextSelected.id);
        }
    }, [
        filteredItems,
        querySignature,
        routeContext.carrier,
        routeContext.clientId,
        routeContext.exception,
        routeContext.logisticsId,
        routeContext.orderId,
        routeContext.status,
    ]);

    const selectedItem =
        resolvePreferredItem({
            items: filteredItems,
            allItems: mockLogistics,
            explicitId: selectedId,
            getId: (item) => item.id,
        }) ?? mockLogistics[0];

    const routeItem = routeContext.logisticsId
        ? mockLogistics.find((item) => item.id === routeContext.logisticsId)
        : undefined;
    const routeOrder = routeContext.orderId
        ? mockLogistics.find((item) => item.order.id === routeContext.orderId)?.order
        : undefined;
    const routeClient = routeContext.clientId
        ? mockLogistics.find((item) => item.order.customer.id === routeContext.clientId)?.order.customer
        : undefined;

    function handleSelect(id: string) {
        startTransition(() => {
            setSelectedId(id);
        });
    }

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Logistica"
                title="Central operacional de logistica"
                description="Fila viva para cotacao, SLA, tracking, excecoes e intervencao humana, conectada a pedido, cliente e conversa."
                meta={
                    <>
                        <StatusChip label="30 registros mock" tone="info" />
                        <StatusChip label="fila logistica real" tone="success" />
                        <StatusChip label="deep links preparados" tone="warning" />
                        {routeItem ? <StatusChip label={`logistica ${routeItem.id}`} tone="warning" /> : null}
                        {routeOrder ? <StatusChip label={`pedido #${routeOrder.id}`} tone="neutral" /> : null}
                        {routeClient ? <StatusChip label={`cliente ${routeClient.company}`} tone="neutral" /> : null}
                    </>
                }
                actions={
                    <>
                        <Link href="/logistica/simulador">
                            <Button variant="secondary">Abrir simulador</Button>
                        </Link>
                        <Link href="/pedidos">
                            <Button>Ir para pedidos</Button>
                        </Link>
                    </>
                }
            />

            <ModuleNav
                items={[
                    { label: 'Fila', current: true, detail: 'Busca, SLA, excecao e prioridade' },
                    { label: 'Detalhe', detail: 'Resumo, timeline, simulacoes e historico' },
                    { label: 'Contexto', detail: 'Cliente, pedido e acoes rapidas' },
                    { label: 'Evolucao', detail: 'Preparado para NBA e queue inteligente' },
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)_22rem]">
                <LogisticsList
                    items={filteredItems}
                    totalCount={mockLogistics.length}
                    selectedId={selectedItem.id}
                    searchValue={searchValue}
                    statusFilter={statusFilter}
                    exceptionFilter={exceptionFilter}
                    carrierFilter={carrierFilter}
                    regionFilter={regionFilter}
                    deadlineFilter={deadlineFilter}
                    priorityFilter={priorityFilter}
                    periodFilter={periodFilter}
                    carriers={carrierOptions}
                    onSearchChange={setSearchValue}
                    onStatusFilterChange={setStatusFilter}
                    onExceptionFilterChange={setExceptionFilter}
                    onCarrierFilterChange={setCarrierFilter}
                    onRegionFilterChange={setRegionFilter}
                    onDeadlineFilterChange={setDeadlineFilter}
                    onPriorityFilterChange={setPriorityFilter}
                    onPeriodFilterChange={setPeriodFilter}
                    onSelect={handleSelect}
                />

                <LogisticsDetail item={selectedItem} />

                <ShellContainer>
                    <LogisticsCustomerContext item={selectedItem} />
                    <LogisticsShippingContext item={selectedItem} />
                    <LogisticsActions item={selectedItem} />
                </ShellContainer>
            </div>
        </ShellContainer>
    );
}
