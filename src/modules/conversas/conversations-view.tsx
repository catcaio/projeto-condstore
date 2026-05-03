'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseConversationsQueryState, resolvePreferredItem } from '@/modules/navigation';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip } from '@/ui/foundation';
import { ConversationContext } from './components/conversation-context';
import { ConversationList } from './components/conversation-list';
import { ConversationThread } from './components/conversation-thread';
import { useConversations } from './use-conversations';
import type { ConversationPriority, ConversationStatus } from './types';
import { PanelLeftClose, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { BulkActionBar } from '@/ui/foundation';

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
        assignConversation,
        escalateConversation
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

    const [isContextOpen, setIsContextOpen] = useState(false);
    const [isListOpen, setIsListOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

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

            {selectedConversation && (
                <div className="flex justify-between items-center 2xl:hidden bg-[hsl(var(--ui-page))] px-4 py-2 mt-4 rounded-xl border border-[hsl(var(--ui-border))]">
                    <Button variant="ghost" size="sm" className="xl:hidden" onClick={() => { setIsListOpen(!isListOpen); setIsContextOpen(false); }}>
                        <PanelLeftClose className={`w-4 h-4 mr-2 ${isListOpen ? '' : 'rotate-180'}`} />
                        {isListOpen ? 'Ocultar Fila' : 'Ver Fila'}
                    </Button>
                    <div className="xl:hidden" />
                    <Button variant="ghost" size="sm" onClick={() => { setIsContextOpen(!isContextOpen); setIsListOpen(false); }}>
                        {isContextOpen ? 'Ocultar Contexto' : 'Ver Contexto'}
                        <PanelLeftClose className={`w-4 h-4 ml-2 ${isContextOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </div>
            )}

            <div className={`flex flex-col xl:flex-row gap-6 items-start relative min-h-[70vh] ${selectedConversation ? 'mt-4' : 'mt-6'}`}>
                {/* Left Pane (List) */}
                <div className={`
                    w-full xl:w-[320px] 2xl:w-[340px] shrink-0
                    ${selectedConversation ? (isListOpen ? 'block' : 'hidden xl:block') : 'block'}
                `}>
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
                        onAssignConversation={assignConversation}
                        onEscalateConversation={escalateConversation}
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                    />
                </div>

                {/* Center Pane */}
                {selectedConversation && (
                    <div className={`
                        flex-1 min-w-0 w-full
                        ${(isListOpen || isContextOpen) ? 'hidden xl:block' : 'block'}
                    `}>
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
                    </div>
                )}

                {/* Right Pane (Context) */}
                {selectedConversation && (
                    <div className={`
                        w-full xl:w-[360px] 2xl:w-[380px] shrink-0
                        ${isContextOpen ? 'block' : 'hidden 2xl:block'}
                    `}>
                        <ConversationContext conversation={selectedConversation} />
                    </div>
                )}
            </div>

            <BulkActionBar
                selectedCount={Object.keys(rowSelection).filter(k => rowSelection[k]).length}
                onClearSelection={() => setRowSelection({})}
            >
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs" onClick={() => {}}>
                    <UserPlus className="mr-2 h-3.5 w-3.5" /> Atribuir
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400" onClick={() => {}}>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Resolver
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" onClick={() => {}}>
                    <XCircle className="mr-2 h-3.5 w-3.5" /> Escalar
                </Button>
            </BulkActionBar>
        </ShellContainer>
    );
}
