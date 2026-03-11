'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseConversationsQueryState } from '@/modules/navigation/query-state';
import { resolvePreferredItem } from '@/modules/navigation/selection-utils';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip } from '@/ui/foundation';
import { ConversationContext } from './components/conversation-context';
import { ConversationList } from './components/conversation-list';
import { ConversationThread } from './components/conversation-thread';
import { mockConversations, type ConversationPriority, type ConversationStatus } from './mock-data';

type StatusFilter = ConversationStatus | 'todas';
type PriorityFilter = ConversationPriority | 'todas';

const ownerOptions = Array.from(new Set(mockConversations.map((conversation) => conversation.owner)));

export function ConversationsView() {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(
        () => parseConversationsQueryState(searchParams),
        [querySignature, searchParams]
    );
    const [selectedConversationId, setSelectedConversationId] = useState(mockConversations[0]?.id ?? '');
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
    const [ownerFilter, setOwnerFilter] = useState('todos');
    const [draft, setDraft] = useState('');

    const deferredSearch = useDeferredValue(searchValue);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todas');
        setPriorityFilter(routeContext.priority ?? 'todas');
        setOwnerFilter('todos');
        setDraft('');
    }, [querySignature, routeContext.priority, routeContext.status]);

    const filteredConversations = mockConversations.filter((conversation) => {
        const searchMatches =
            deferredSearch.trim().length === 0 ||
            [
                conversation.customerName,
                conversation.customerSegment,
                conversation.lastMessage,
                conversation.owner,
                conversation.relatedOrderId,
                conversation.context.detectedIntent,
            ]
                .join(' ')
                .toLowerCase()
                .includes(deferredSearch.toLowerCase());

        const statusMatches = statusFilter === 'todas' || conversation.status === statusFilter;
        const priorityMatches = priorityFilter === 'todas' || conversation.priority === priorityFilter;
        const ownerMatches = ownerFilter === 'todos' || conversation.owner === ownerFilter;
        const clientMatches = !routeContext.clientId || conversation.relatedClientId === routeContext.clientId;
        const logisticsMatches =
            !routeContext.logisticsId ||
            (routeContext.clientId
                ? true
                : conversation.relatedLogisticsId === routeContext.logisticsId);

        return searchMatches && statusMatches && priorityMatches && ownerMatches && clientMatches && logisticsMatches;
    });

    useEffect(() => {
        if (!routeContext.conversationId && !routeContext.clientId && !routeContext.logisticsId && !routeContext.status && !routeContext.priority) {
            return;
        }

        const preferredPredicates: Array<(conversation: (typeof mockConversations)[number]) => boolean> = [];
        if (routeContext.clientId && routeContext.logisticsId) {
            preferredPredicates.push(
                (conversation) =>
                    conversation.relatedClientId === routeContext.clientId &&
                    conversation.relatedLogisticsId === routeContext.logisticsId
            );
        } else if (routeContext.logisticsId) {
            preferredPredicates.push(
                (conversation) => conversation.relatedLogisticsId === routeContext.logisticsId
            );
        } else if (routeContext.clientId) {
            preferredPredicates.push(
                (conversation) => conversation.relatedClientId === routeContext.clientId
            );
        }

        const nextSelected = resolvePreferredItem({
            items: filteredConversations,
            explicitId: routeContext.conversationId,
            getId: (conversation) => conversation.id,
            preferredPredicates,
        });

        if (nextSelected?.id) {
            setSelectedConversationId(nextSelected.id);
        }
    }, [
        filteredConversations,
        querySignature,
        routeContext.clientId,
        routeContext.conversationId,
        routeContext.logisticsId,
        routeContext.priority,
        routeContext.status,
    ]);

    const selectedConversation =
        resolvePreferredItem({
            items: filteredConversations,
            allItems: mockConversations,
            explicitId: selectedConversationId,
            getId: (conversation) => conversation.id,
        }) ?? mockConversations[0];

    const routeConversation = routeContext.conversationId
        ? mockConversations.find((conversation) => conversation.id === routeContext.conversationId)
        : undefined;
    const routeClientConversation = routeContext.clientId
        ? mockConversations.find((conversation) => conversation.relatedClientId === routeContext.clientId)
        : undefined;

    function handleSelectConversation(conversationId: string) {
        startTransition(() => {
            setSelectedConversationId(conversationId);
            setDraft('');
        });
    }

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Conversas"
                title="Inbox operacional canonica"
                description="Fila tripla para atendimento real: lista densa, thread ativa e contexto operacional do cliente no mesmo campo de visao."
                meta={
                    <>
                        <StatusChip label="20 conversas mock" tone="info" />
                        <StatusChip label="alta densidade" tone="success" />
                        <StatusChip label="legado preservado" tone="neutral" />
                        {routeConversation ? <StatusChip label={`conversa ${routeConversation.id}`} tone="warning" /> : null}
                        {routeClientConversation ? <StatusChip label={`cliente ${routeClientConversation.customerName}`} tone="neutral" /> : null}
                        {routeContext.logisticsId ? <StatusChip label={`logistica ${routeContext.logisticsId}`} tone="neutral" /> : null}
                    </>
                }
                actions={
                    <>
                        <Link href="/operacao/inbox">
                            <Button variant="ghost">Fila legada</Button>
                        </Link>
                        <Link href="/inbox">
                            <Button variant="secondary">Abrir inbox legado</Button>
                        </Link>
                    </>
                }
            />

            <ModuleNav
                items={[
                    { label: 'Fila', current: true, detail: 'Busca, filtros e ownership' },
                    { label: 'Thread', detail: 'Historico, IA e resposta' },
                    { label: 'Contexto', detail: 'Cliente, pedidos e simulacoes' },
                    { label: 'Compatibilidade', detail: 'Legado preservado ate migracao' },
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)_22rem]">
                <ConversationList
                    conversations={filteredConversations}
                    totalCount={mockConversations.length}
                    selectedConversationId={selectedConversation.id}
                    searchValue={searchValue}
                    statusFilter={statusFilter}
                    priorityFilter={priorityFilter}
                    ownerFilter={ownerFilter}
                    owners={ownerOptions}
                    onSearchChange={setSearchValue}
                    onStatusFilterChange={setStatusFilter}
                    onPriorityFilterChange={setPriorityFilter}
                    onOwnerFilterChange={setOwnerFilter}
                    onSelectConversation={handleSelectConversation}
                />
                <ConversationThread conversation={selectedConversation} draft={draft} onDraftChange={setDraft} />
                <ConversationContext conversation={selectedConversation} />
            </div>
        </ShellContainer>
    );
}
