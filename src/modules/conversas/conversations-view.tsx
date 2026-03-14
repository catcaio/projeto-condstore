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
import { useConversations } from './use-conversations';
import type { ConversationPriority, ConversationStatus } from './types';

type StatusFilter = ConversationStatus | 'todas';
type PriorityFilter = ConversationPriority | 'todas';

export function ConversationsView() {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(
        () => parseConversationsQueryState(searchParams),
        [querySignature, searchParams]
    );

    const {
        conversations: allConversations,
        loading,
        threadLoading,
        sendingReply,
        selectedConversationId,
        loadConversationThread,
        sendReply,
    } = useConversations();

    const ownerOptions = useMemo(
        () => Array.from(new Set(allConversations.map((c) => c.owner))),
        [allConversations]
    );

    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
    const [ownerFilter, setOwnerFilter] = useState('todos');
    const [draft, setDraft] = useState('');

    const deferredSearch = useDeferredValue(searchValue);

    // Select first conversation once data loads
    useEffect(() => {
        if (allConversations.length > 0 && !selectedConversationId) {
            void loadConversationThread(allConversations[0].id);
        }
    }, [allConversations, loadConversationThread, selectedConversationId]);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todas');
        setPriorityFilter(routeContext.priority ?? 'todas');
        setOwnerFilter('todos');
        setDraft('');
    }, [querySignature, routeContext.priority, routeContext.status]);

    const filteredConversations = allConversations.filter((conversation) => {
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

        const preferredPredicates: Array<(conversation: (typeof allConversations)[number]) => boolean> = [];
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
            void loadConversationThread(nextSelected.id);
        }
    }, [
        allConversations,
        filteredConversations,
        querySignature,
        routeContext.clientId,
        routeContext.conversationId,
        routeContext.logisticsId,
        routeContext.priority,
        routeContext.status,
        loadConversationThread,
    ]);

    const selectedConversation =
        resolvePreferredItem({
            items: filteredConversations,
            allItems: allConversations,
            explicitId: selectedConversationId,
            getId: (conversation) => conversation.id,
        }) ?? allConversations[0];

    const routeConversation = routeContext.conversationId
        ? allConversations.find((conversation) => conversation.id === routeContext.conversationId)
        : undefined;
    const routeClientConversation = routeContext.clientId
        ? allConversations.find((conversation) => conversation.relatedClientId === routeContext.clientId)
        : undefined;

    function handleSelectConversation(conversationId: string) {
        startTransition(() => {
            void loadConversationThread(conversationId);
            setDraft('');
        });
    }

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Conversas"
                title="Inbox operacional"
                description="Fila para atendimento real: lista densa, thread ativa e contexto operacional do cliente no mesmo campo de visao."
                meta={
                    <>
                        <StatusChip label={loading ? 'carregando...' : `${allConversations.length} conversas`} tone="info" />
                        <StatusChip label="alta densidade" tone="success" />
                        {routeConversation ? <StatusChip label={`conversa ${routeConversation.id.slice(0, 8)}`} tone="warning" /> : null}
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
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)_22rem]">
                <ConversationList
                    conversations={filteredConversations}
                    totalCount={allConversations.length}
                    selectedConversationId={selectedConversation?.id ?? ''}
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
                {selectedConversation ? (
                    <>
                        <ConversationThread
                            conversation={selectedConversation}
                            draft={draft}
                            threadLoading={threadLoading}
                            sendingReply={sendingReply}
                            onDraftChange={setDraft}
                            onReply={async () => {
                                const result = await sendReply(draft);
                                if (result.ok) {
                                    setDraft('');
                                }
                            }}
                        />
                        <ConversationContext conversation={selectedConversation} />
                    </>
                ) : null}
            </div>
        </ShellContainer>
    );
}
