'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseClientsQueryState } from '@/modules/navigation/query-state';
import { resolvePreferredItem } from '@/modules/navigation/selection-utils';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip, UniversalListView, InspectorDrawer, SavedViewsTabs, BulkActionBar, OperationalTimelineWidget, AddNoteForm } from '@/ui/foundation';
import { ClientActions } from './components/client-actions';
import { ClientConversations } from './components/client-conversations';
import { ClientOrders } from './components/client-orders';
import { ClientProfile } from './components/client-profile';
import { ClientSimulations } from './components/client-simulations';
import { ClientsList } from './components/clients-list';
import type { ClientRecord, ClientActivityBucket, ClientStatus, CrmStage } from './types';
import { PanelLeftClose, Kanban, List, CheckCircle2, UserPlus, FileArchive, MessageCircle, CalendarPlus, FileText, MessageSquare, Zap, RefreshCw } from 'lucide-react';
import { SharedKanbanBoard, KanbanColumn, KanbanCard, DropdownStatusSelector } from '@/ui/foundation';
import { updateClientOpportunityStage } from './actions/update-stage';
import { getOperationalHistoryAction, addOperationalNoteAction } from '@/modules/audit/audit.actions';
import { getPendingFrankActions, approveAndExecuteFrankAction, rejectFrankAction } from '@/modules/frank/actions/review';
import { ActionPlayground } from '@/ui/frank/action-playground';
import { BulkActionPreviewModal, BulkPreviewItem } from '@/ui/foundation/bulk-action-preview-modal';

type StatusFilter = ClientStatus | 'todos';
type ActivityFilter = ClientActivityBucket | 'todas';
type TagFilter = string | 'todas';

const availableTags = ['premium', 'recompra', 'atraso', 'urgente', 'frete', 'sla'];

interface ClientsViewProps {
    clients: ClientRecord[];
}

export function ClientsView({ clients }: ClientsViewProps) {
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(
        () => parseClientsQueryState(searchParams, { availableTags }),
        [querySignature, searchParams]
    );
    const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>('todas');
    const [tagFilter, setTagFilter] = useState<TagFilter>('todas');

    const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('kanban');

    const [isContextOpen, setIsContextOpen] = useState(false);
    const [activeDrawerTab, setActiveDrawerTab] = useState('detalhes');
    const [timelineHistory, setTimelineHistory] = useState<any[]>([]);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

    const [pendingActions, setPendingActions] = useState<any[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);

    // Bulk Action Preview State
    const [previewModalConfig, setPreviewModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        actionLabel: string;
        actionType: 'advance' | 'assign' | 'archive' | null;
        items: BulkPreviewItem[];
        isExecuting: boolean;
    }>({
        isOpen: false,
        title: '',
        description: '',
        actionLabel: '',
        actionType: null,
        items: [],
        isExecuting: false,
    });

    const [isListOpen, setIsListOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const deferredSearch = useDeferredValue(searchValue);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todos');
        setActivityFilter(routeContext.activity ?? 'todas');
        setTagFilter(routeContext.tag ?? 'todas');
    }, [querySignature, routeContext.activity, routeContext.status, routeContext.tag]);

    const filteredClients = clients.filter((client) => {
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
            allItems: clients,
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
            allItems: clients,
            explicitId: selectedClientId,
            getId: (client) => client.id,
        }) ?? clients[0];

    const routeClient = routeContext.clientId
        ? clients.find((client) => client.id === routeContext.clientId)
        : undefined;

    const handleSelectClient = (clientId: string) => {
        setSelectedClientId(clientId);
        setIsContextOpen(true);
        setActiveDrawerTab('detalhes');

        setIsLoadingTimeline(true);
        getOperationalHistoryAction('client', clientId)
            .then(data => setTimelineHistory(data))
            .catch(console.error)
            .finally(() => setIsLoadingTimeline(false));
    };

    const handleTabChange = (tabId: string) => {
        setActiveDrawerTab(tabId);
        if (tabId === 'timeline' && selectedClient) {
            refreshTimeline(selectedClient.id);
        }
        if (tabId === 'acoes' && selectedClient) {
            refreshActions(selectedClient.id);
        }
    };

    const refreshTimeline = (clientId: string) => {
        setIsLoadingTimeline(true);
        getOperationalHistoryAction('client', clientId)
            .then(data => setTimelineHistory(data))
            .catch(console.error)
            .finally(() => setIsLoadingTimeline(false));
    };

    const refreshActions = (clientId: string) => {
        setIsLoadingActions(true);
        getPendingFrankActions('client', clientId)
            .then(data => setPendingActions(data))
            .catch(console.error)
            .finally(() => setIsLoadingActions(false));
    };

    const handleApproveAction = async (actionId: string, updatedPayload: any) => {
        const res = await approveAndExecuteFrankAction(actionId, updatedPayload);
        if (selectedClient && res.success) {
            refreshActions(selectedClient.id);
            refreshTimeline(selectedClient.id);
        }
        return res;
    };

    const handleRejectAction = async (actionId: string) => {
        const res = await rejectFrankAction(actionId);
        if (selectedClient && res.success) {
            refreshActions(selectedClient.id);
        }
        return res;
    };

    const handleBulkActionPreview = (actionType: 'advance' | 'assign' | 'archive') => {
        const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k]);
        if (selectedIds.length === 0) return;

        const selectedClients = clients.filter(c => selectedIds.includes(c.id));
        
        const previewItems: BulkPreviewItem[] = selectedClients.map(client => {
            let changes: BulkPreviewItem['changes'] = [];
            
            if (actionType === 'advance') {
                const currentStage = client.opportunity?.stage || 'new_lead';
                const nextPhase = currentStage === 'new_lead' ? 'qualified' : 
                                  currentStage === 'qualified' ? 'negotiating' : 'won';
                                  
                changes = [{
                    label: 'Fase/Estágio',
                    from: currentStage,
                    to: <span className="text-emerald-600 dark:text-emerald-500">{nextPhase}</span>
                }];
            } else if (actionType === 'assign') {
                changes = [{
                    label: 'Responsável',
                    from: 'Sistema CRM',
                    to: <span className="text-blue-600 dark:text-blue-500">Julio Cezar</span>
                }];
            } else if (actionType === 'archive') {
                changes = [{
                    label: 'Status',
                    from: client.status,
                    to: <span className="text-rose-600 dark:text-rose-500">inativo</span>
                }];
            }

            return {
                id: client.id,
                title: client.company,
                subtitle: `Email: ${client.email}`,
                changes
            };
        });

        const actionConfigMap = {
            advance: {
                title: 'Avançar Fase no Funil',
                description: 'Você está prestes a mover os seguintes clientes para a próxima fase do funil de vendas.',
                actionLabel: 'Avançar Selecionados'
            },
            assign: {
                title: 'Atribuir Responsável',
                description: 'Você está redistribuindo a carteira para um novo executivo de contas.',
                actionLabel: 'Confirmar Atribuição'
            },
            archive: {
                title: 'Arquivar Clientes',
                description: 'Esta ação moverá os clientes para o arquivo inativo. Pode ser desfeita posteriormente.',
                actionLabel: 'Arquivar Selecionados'
            }
        };

        const config = actionConfigMap[actionType];

        setPreviewModalConfig({
            isOpen: true,
            title: config.title,
            description: config.description,
            actionLabel: config.actionLabel,
            actionType: actionType,
            items: previewItems,
            isExecuting: false,
        });
    };

    const handleExecuteBulkAction = async (itemIds: string[]) => {
        setPreviewModalConfig(prev => ({ ...prev, isExecuting: true }));
        try {
            // Simulate network delay for bulk execution
            await new Promise(resolve => setTimeout(resolve, 1500));
            // TODO: Call actual Server Action here (e.g. bulkAdvancePipelineStatus)
            
            // Clear selection and close modal on success
            setRowSelection({});
            setPreviewModalConfig(prev => ({ ...prev, isOpen: false, isExecuting: false }));
        } catch (error) {
            console.error('Falha ao executar ação em lote', error);
            setPreviewModalConfig(prev => ({ ...prev, isExecuting: false }));
            // TODO: show toast error
        }
    };

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Clientes"
                title="Cliente 360 operacional"
                description="Visao unificada para relacionar atendimento, pedidos, simulacoes e historico recente sem cair em um CRM generico."
                meta={
                    <>
                        <StatusChip label={`${clients.length} clientes`} tone="info" />
                        <StatusChip label="visao unificada" tone="success" />
                        <StatusChip label="acoes operacionais" tone="warning" />
                        {routeClient ? <StatusChip label={`cliente ${routeClient.company}`} tone="warning" /> : null}
                        {routeContext.tag ? <StatusChip label={`tag ${routeContext.tag}`} tone="neutral" /> : null}
                    </>
                }
                actions={
                    <>
                        <SavedViewsTabs 
                            activeView={viewMode}
                            onChange={(val) => setViewMode(val as 'lista' | 'kanban')}
                            views={[
                                { id: 'kanban', label: 'Board', icon: <Kanban className="h-4 w-4" /> },
                                { id: 'lista', label: 'Lista', icon: <List className="h-4 w-4" /> }
                            ]}
                        />
                        <div className="h-6 w-px bg-[hsl(var(--ui-border))] mx-2" />
                        <Link href="/conversas">
                            <Button variant="secondary">Abrir conversas</Button>
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

            {selectedClient && (
                <div className="flex justify-between items-center 2xl:hidden bg-[hsl(var(--ui-page))] px-4 py-2 mt-4 rounded-xl border border-[hsl(var(--ui-border))]">
                    <Button variant="ghost" size="sm" className="xl:hidden" onClick={() => { setIsListOpen(!isListOpen); setIsContextOpen(false); }}>
                        <PanelLeftClose className={`w-4 h-4 mr-2 ${isListOpen ? '' : 'rotate-180'}`} />
                        {isListOpen ? 'Ocultar Lista' : 'Ver Lista'}
                    </Button>
                    <div className="xl:hidden" />
                    <Button variant="ghost" size="sm" onClick={() => { setIsContextOpen(!isContextOpen); setIsListOpen(false); }}>
                        {isContextOpen ? 'Ocultar Contexto' : 'Ver Contexto'}
                        <PanelLeftClose className={`w-4 h-4 ml-2 ${isContextOpen ? 'rotate-180' : ''}`} />
                    </Button>
                </div>
            )}

            <div className={`flex flex-col xl:flex-row gap-6 items-start relative min-h-[70vh] ${selectedClient ? 'mt-4' : 'mt-6'}`}>
                
                {viewMode === 'kanban' ? (
                    <div className="w-full flex-1 overflow-x-auto pb-4">
                        <SharedKanbanBoard>
                            {(['new_lead', 'qualified', 'quoted', 'proposal_sent', 'negotiating', 'won', 'lost'] as CrmStage[]).map(stageId => {
                                const stageClients = filteredClients.filter(c => c.opportunity?.stage === stageId);
                                
                                const stageMap: Record<CrmStage, { label: string; color: string }> = {
                                    new_lead: { label: 'Novo Lead', color: 'bg-blue-500' },
                                    qualified: { label: 'Qualificado', color: 'bg-indigo-500' },
                                    quoted: { label: 'Cotado', color: 'bg-amber-400' },
                                    proposal_sent: { label: 'Apresentacao', color: 'bg-orange-500' },
                                    negotiating: { label: 'Follow-up', color: 'bg-purple-500' },
                                    won: { label: 'Ganho', color: 'bg-green-500' },
                                    lost: { label: 'Perdido', color: 'bg-red-500' },
                                };
                                const stage = stageMap[stageId];
                                
                                return (
                                    <KanbanColumn 
                                        key={stageId} 
                                        id={stageId} 
                                        title={stage.label} 
                                        count={stageClients.length} 
                                        color={stage.color}
                                        onDrop={async (type, itemId) => {
                                            const clientDrop = filteredClients.find(c => c.id === itemId);
                                            if (clientDrop?.opportunity?.id) {
                                                await updateClientOpportunityStage(clientDrop.opportunity.id, stageId);
                                            }
                                        }}
                                    >
                                        {stageClients.map(client => (
                                            <KanbanCard 
                                                key={client.id} 
                                                id={client.id} 
                                                onClick={() => { handleSelectClient(client.id); setIsContextOpen(true); }}
                                                className={selectedClient?.id === client.id ? 'ring-2 ring-[hsl(var(--ui-accent-blue))] border-transparent' : ''}
                                                isSelected={!!rowSelection[client.id]}
                                                onSelectChange={(checked) => {
                                                    setRowSelection(prev => ({ ...prev, [client.id]: checked }));
                                                }}
                                            >
                                                <div className="flex flex-col gap-2 relative">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <p className="text-sm font-bold text-[hsl(var(--ui-text))] leading-tight pr-6">{client.company}</p>
                                                        <div className="absolute top-0 right-6 hidden group-hover:flex gap-1 z-20 bg-[hsl(var(--ui-page))] shadow-sm rounded-md border border-[hsl(var(--ui-border))] p-0.5">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 rounded text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-950/30" 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    window.open(`https://wa.me/5511999999999?text=Olar,%20${client.contact}`, '_blank'); 
                                                                }}
                                                            >
                                                                <MessageCircle className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-500 dark:hover:bg-blue-950/30" 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    console.warn('[TODO] Follow-up scheduling not wired yet for client:', client.id); 
                                                                }}
                                                            >
                                                                <CalendarPlus className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                        {client.opportunity?.amount && (
                                                            <span className="text-[11px] font-semibold text-[hsl(var(--ui-success-ink))] bg-[hsl(var(--ui-success)/0.1)] px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                                                                R$ {client.opportunity.amount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[hsl(var(--ui-text-muted))]">{client.contact || 'Sem contato'}</p>
                                                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                                                        <DropdownStatusSelector 
                                                            currentStatus={{ value: stageId, label: stage.label, colorClass: stage.color }}
                                                            options={Object.entries(stageMap).map(([k, v]) => ({ value: k, label: v.label, colorClass: v.color }))}
                                                            onChange={async (newStatus) => {
                                                                if (client.opportunity?.id) {
                                                                    await updateClientOpportunityStage(client.opportunity.id, newStatus as CrmStage);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </KanbanCard>
                                        ))}
                                    </KanbanColumn>
                                );
                            })}
                        </SharedKanbanBoard>
                    </div>
                ) : (
                    <>
                        {/* Left Pane (List) */}
                        <div className={`
                            w-full xl:w-[320px] 2xl:w-[340px] shrink-0
                            ${selectedClient ? (isListOpen ? 'block' : 'hidden xl:block') : 'block'}
                        `}>
                            <ClientsList
                                clients={filteredClients}
                                totalCount={clients.length}
                                selectedClientId={selectedClient?.id}
                                searchValue={searchValue}
                                statusFilter={statusFilter}
                                activityFilter={activityFilter}
                                onSearchChange={setSearchValue}
                                onStatusFilterChange={setStatusFilter}
                                onActivityFilterChange={setActivityFilter}
                                onSelectClient={handleSelectClient}
                                rowSelection={rowSelection}
                                onRowSelectionChange={setRowSelection}
                            />
                        </div>

                        {/* Center Pane */}
                        {selectedClient && (
                            <div className={`
                                flex-1 min-w-0 w-full
                                ${(isListOpen || isContextOpen) ? 'hidden xl:block' : 'block'}
                            `}>
                                <ClientProfile client={selectedClient} />
                            </div>
                        )}
                    </>
                )}

                {/* Right Pane replacement with Contextual InspectorDrawer */}
                {selectedClient && (
                    <InspectorDrawer
                        isOpen={isContextOpen}
                        onClose={() => setIsContextOpen(false)}
                        title={selectedClient.company}
                        tabs={[
                            { id: 'detalhes', label: 'Contexto', icon: <FileText className="h-4 w-4" /> },
                            { id: 'timeline', label: 'Timeline', icon: <MessageSquare className="h-4 w-4" /> },
                            { id: 'acoes', label: 'Ações (Frank)', icon: <Zap className="h-4 w-4 text-amber-500" /> }
                        ]}
                        activeTab={activeDrawerTab}
                        onTabChange={handleTabChange}
                    >
                        <div className="flex flex-col gap-6 pt-4">
                            {activeDrawerTab === 'detalhes' && (
                                <>
                                    <ClientConversations
                                        clientId={selectedClient.id}
                                        items={selectedClient.conversations || []}
                                        title="Conversas"
                                        description="Últimas threads e ownership atual."
                                        compact
                                    />
                                    <ClientOrders
                                        clientId={selectedClient.id}
                                        items={selectedClient.orders || []}
                                        title="Pedidos"
                                        description="Pedidos recentes com status operacional."
                                        compact
                                    />
                                    <ClientSimulations
                                        clientId={selectedClient.id}
                                        items={selectedClient.simulations || []}
                                        title="Simulações"
                                        description="Cotações recentes ligadas ao cliente."
                                        compact
                                    />
                                    <ClientActions client={selectedClient} />
                                </>
                            )}
                            {activeDrawerTab === 'timeline' && (
                                <div className="flex flex-col gap-6 p-4">
                                    <AddNoteForm 
                                        onSubmit={async (note) => {
                                            if (!selectedClient) return;
                                            await addOperationalNoteAction('client', selectedClient.id, note);
                                            setIsLoadingTimeline(true);
                                            const data = await getOperationalHistoryAction('client', selectedClient.id);
                                            setTimelineHistory(data);
                                            setIsLoadingTimeline(false);
                                        }} 
                                        placeholder="Adicionar nota sobre o cliente..." 
                                    />
                                    <OperationalTimelineWidget history={timelineHistory} isLoading={isLoadingTimeline} />
                                </div>
                            )}
                            {activeDrawerTab === 'acoes' && (
                                <div className="flex flex-col gap-6 p-4">
                                    {isLoadingActions ? (
                                        <div className="flex flex-col items-center justify-center p-8">
                                            <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
                                        </div>
                                    ) : pendingActions.length > 0 ? (
                                        pendingActions.map(action => (
                                            <ActionPlayground
                                                key={action.id}
                                                actionId={action.id}
                                                type={action.type}
                                                status={action.status}
                                                payload={action.payload}
                                                explanation={action.explanation as any}
                                                onApprove={handleApproveAction}
                                                onReject={handleRejectAction}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-[hsl(var(--ui-border))] rounded-2xl mx-1">
                                            <Zap className="h-6 w-6 text-amber-500 mb-2 opacity-50" />
                                            <p className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">Zero ações pendentes</p>
                                            <p className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Nenhuma sugestão do Frank aguardando revisão para este cliente.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </InspectorDrawer>
                )}
            </div>

            <BulkActionBar
                selectedCount={Object.keys(rowSelection).filter(k => rowSelection[k]).length}
                onClearSelection={() => setRowSelection({})}
            >
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleBulkActionPreview('assign')}>
                    <UserPlus className="mr-2 h-3.5 w-3.5" /> Atribuir
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400" onClick={() => handleBulkActionPreview('advance')}>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Avançar Fase
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" onClick={() => handleBulkActionPreview('archive')}>
                    <FileArchive className="mr-2 h-3.5 w-3.5" /> Arquivar
                </Button>
            </BulkActionBar>

            <BulkActionPreviewModal
                isOpen={previewModalConfig.isOpen}
                onClose={() => setPreviewModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleExecuteBulkAction}
                title={previewModalConfig.title}
                description={previewModalConfig.description}
                actionLabel={previewModalConfig.actionLabel}
                items={previewModalConfig.items}
                isExecuting={previewModalConfig.isExecuting}
            />
        </ShellContainer>
    );
}
