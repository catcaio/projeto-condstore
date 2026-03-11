'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseClientsQueryState } from '@/modules/navigation/query-state';
import { resolvePreferredItem } from '@/modules/navigation/selection-utils';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip } from '@/ui/foundation';
import { ClientActions } from './components/client-actions';
import { ClientConversations } from './components/client-conversations';
import { ClientOrders } from './components/client-orders';
import { ClientProfile } from './components/client-profile';
import { ClientSimulations } from './components/client-simulations';
import { ClientsList } from './components/clients-list';
import { mockClients, type ClientActivityBucket, type ClientStatus } from './mock-data';

type StatusFilter = ClientStatus | 'todos';
type ActivityFilter = ClientActivityBucket | 'todas';
type TagFilter = string | 'todas';

const availableTags = Array.from(new Set(mockClients.flatMap((client) => client.tags)));

export function ClientsView() {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(
        () => parseClientsQueryState(searchParams, { availableTags }),
        [querySignature, searchParams]
    );
    const [selectedClientId, setSelectedClientId] = useState(mockClients[0]?.id ?? '');
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>('todas');
    const [tagFilter, setTagFilter] = useState<TagFilter>('todas');

    const deferredSearch = useDeferredValue(searchValue);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todos');
        setActivityFilter(routeContext.activity ?? 'todas');
        setTagFilter(routeContext.tag ?? 'todas');
    }, [querySignature, routeContext.activity, routeContext.status, routeContext.tag]);

    const filteredClients = mockClients.filter((client) => {
        const searchMatches =
            deferredSearch.trim().length === 0 ||
            [
                client.company,
                client.name,
                client.contact,
                client.city,
                client.segment,
                client.tags.join(' '),
            ]
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch.toLowerCase());

        const statusMatches = statusFilter === 'todos' || client.status === statusFilter;
        const activityMatches = activityFilter === 'todas' || client.activityBucket === activityFilter;
        const tagMatches = tagFilter === 'todas' || client.tags.includes(tagFilter);

        return searchMatches && statusMatches && activityMatches && tagMatches;
    });

    useEffect(() => {
        if (!routeContext.clientId && !routeContext.status && !routeContext.activity && !routeContext.tag) {
            return;
        }

        const nextSelected = resolvePreferredItem({
            items: filteredClients,
            allItems: mockClients,
            explicitId: routeContext.clientId,
            getId: (client) => client.id,
            preferredPredicates: routeContext.clientId ? [(client) => client.id === routeContext.clientId] : [],
        });

        if (nextSelected?.id) {
            setSelectedClientId(nextSelected.id);
        }
    }, [
        filteredClients,
        querySignature,
        routeContext.activity,
        routeContext.clientId,
        routeContext.status,
        routeContext.tag,
    ]);

    const selectedClient =
        resolvePreferredItem({
            items: filteredClients,
            allItems: mockClients,
            explicitId: selectedClientId,
            getId: (client) => client.id,
        }) ?? mockClients[0];

    const routeClient = routeContext.clientId
        ? mockClients.find((client) => client.id === routeContext.clientId)
        : undefined;

    function handleSelectClient(clientId: string) {
        startTransition(() => {
            setSelectedClientId(clientId);
        });
    }

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Clientes"
                title="Cliente 360 operacional"
                description="Visao unificada para relacionar atendimento, pedidos, simulacoes e historico recente sem cair em um CRM generico."
                meta={
                    <>
                        <StatusChip label="25 clientes mock" tone="info" />
                        <StatusChip label="visao unificada" tone="success" />
                        <StatusChip label="acoes operacionais" tone="warning" />
                        {routeClient ? <StatusChip label={`cliente ${routeClient.company}`} tone="warning" /> : null}
                        {routeContext.tag ? <StatusChip label={`tag ${routeContext.tag}`} tone="neutral" /> : null}
                    </>
                }
                actions={
                    <>
                        <Link href="/conversas">
                            <Button variant="secondary">Abrir conversas</Button>
                        </Link>
                        <Link href="/pedidos">
                            <Button>Ver pedidos</Button>
                        </Link>
                    </>
                }
            />

            <ModuleNav
                items={[
                    { label: 'Lista', current: true, detail: 'Busca, status e ultima atividade' },
                    { label: 'Perfil', detail: 'Resumo, metricas e historico recente' },
                    { label: 'Contexto', detail: 'Conversas, pedidos e simulacoes' },
                    { label: 'Acoes', detail: 'Atalhos operacionais por cliente' },
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)_22rem]">
                <ClientsList
                    clients={filteredClients}
                    totalCount={mockClients.length}
                    selectedClientId={selectedClient.id}
                    searchValue={searchValue}
                    statusFilter={statusFilter}
                    activityFilter={activityFilter}
                    onSearchChange={setSearchValue}
                    onStatusFilterChange={setStatusFilter}
                    onActivityFilterChange={setActivityFilter}
                    onSelectClient={handleSelectClient}
                />

                <ClientProfile client={selectedClient} />

                <ShellContainer>
                    <ClientConversations
                        clientId={selectedClient.id}
                        items={selectedClient.conversations}
                        title="Conversas"
                        description="Ultimas threads e ownership atual."
                        compact
                    />
                    <ClientOrders
                        clientId={selectedClient.id}
                        items={selectedClient.orders}
                        title="Pedidos"
                        description="Pedidos recentes com status operacional."
                        compact
                    />
                    <ClientSimulations
                        clientId={selectedClient.id}
                        items={selectedClient.simulations}
                        title="Simulacoes"
                        description="Cotacoes recentes ligadas ao cliente."
                        compact
                    />
                    <ClientActions client={selectedClient} />
                </ShellContainer>
            </div>
        </ShellContainer>
    );
}
