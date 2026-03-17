'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { parseOrdersQueryState, resolvePreferredItem } from '@/modules/navigation';
import { Button } from '@/ui/components';
import { ModuleNav, PageHeader, ShellContainer, StatusChip } from '@/ui/foundation';
import { OrderActions } from './components/order-actions';
import { OrderCustomerContext } from './components/order-customer-context';
import { OrderDetail } from './components/order-detail';
import { OrderLogisticsContext } from './components/order-logistics-context';
import { OperationalTimelineWidget, AddNoteForm } from '@/ui/foundation';
import { getOperationalHistoryAction, addOperationalNoteAction } from '@/modules/audit/audit.actions';
import { getPendingFrankActions, approveAndExecuteFrankAction, rejectFrankAction } from '@/modules/frank/actions/review';
import { bulkApproveOrders, bulkAssignOrderOwner, bulkCancelOrders } from './actions/bulk';
import { ActionPlayground } from '@/ui/frank/action-playground';
import type { OrderRecord, OrderChannel, OrderPeriodBucket, OrderPriority, OrderStatus } from './types';
import { UniversalListView, InspectorDrawer, SavedViewsTabs, BulkActionBar } from '@/ui/foundation';
import { List, LayoutList, CheckCircle2, XCircle, UserPlus, Link2, Wallet, FileText, MessageSquare, Zap, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { BulkActionPreviewModal, BulkPreviewItem } from '@/ui/foundation/bulk-action-preview-modal';

type StatusFilter = OrderStatus | 'todos';
type PriorityFilter = OrderPriority | 'todas';
type ChannelFilter = OrderChannel | 'todos';
type PeriodFilter = OrderPeriodBucket | 'todos';


interface OrdersViewProps {
    orders: OrderRecord[];
}

export function OrdersView({ orders }: OrdersViewProps) {
    const ownerOptions = Array.from(new Set(orders.map((order) => order.owner)));
    const searchParams = useSearchParams();
    const querySignature = searchParams.toString();
    const routeContext = useMemo(() => parseOrdersQueryState(searchParams), [querySignature, searchParams]);
    const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? '');
    const [searchValue, setSearchValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('todos');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
    const [ownerFilter, setOwnerFilter] = useState('todos');

    const [timelineHistory, setTimelineHistory] = useState<any[]>([]);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

    const [pendingActions, setPendingActions] = useState<any[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'tabela' | 'compacta'>('tabela');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [activeDrawerTab, setActiveDrawerTab] = useState('detalhes');

    // Bulk Action Preview State
    const [previewModalConfig, setPreviewModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        actionLabel: string;
        actionType: 'approve' | 'cancel' | 'assign' | null;
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

    const deferredSearch = useDeferredValue(searchValue);

    useEffect(() => {
        setSearchValue('');
        setStatusFilter(routeContext.status ?? 'todos');
        setPriorityFilter(routeContext.priority ?? 'todas');
        setChannelFilter(routeContext.channel ?? 'todos');
        setPeriodFilter('todos');
        setOwnerFilter('todos');
    }, [querySignature, routeContext.channel, routeContext.priority, routeContext.status]);

    const filteredOrders = useMemo(() => orders.filter((order) => {
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
    }), [orders, deferredSearch, statusFilter, priorityFilter, channelFilter, periodFilter, ownerFilter, routeContext.clientId]);

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
            // Optionally auto-open drawer if specifically routing to an order
            if (routeContext.orderId) {
                setIsDrawerOpen(true);
            }
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
            allItems: orders,
            explicitId: selectedOrderId,
            getId: (order) => order.id,
        }) ?? orders[0];

    const routeOrder = routeContext.orderId
        ? orders.find((order) => order.id === routeContext.orderId)
        : undefined;
    const routeClient = routeContext.clientId
        ? orders.find((order) => order.customer.id === routeContext.clientId)?.customer
        : undefined;

    function handleSelectOrder(order: OrderRecord) {
        startTransition(() => {
            setSelectedOrderId(order.id);
            setIsDrawerOpen(true);
            setActiveDrawerTab('detalhes');
            
            // Fetch timeline implicitly
            setIsLoadingTimeline(true);
            getOperationalHistoryAction('order', order.id)
                .then(data => setTimelineHistory(data))
                .catch(console.error)
                .finally(() => setIsLoadingTimeline(false));
        });
    }

    const handleTabChange = (tabId: string) => {
        setActiveDrawerTab(tabId);
        if (tabId === 'timeline' && selectedOrder) {
            refreshTimeline(selectedOrder.id);
        }
        if (tabId === 'acoes' && selectedOrder) {
            refreshActions(selectedOrder.id);
        }
    };

    const refreshTimeline = (orderId: string) => {
        setIsLoadingTimeline(true);
        getOperationalHistoryAction('order', orderId)
            .then(data => setTimelineHistory(data))
            .catch(console.error)
            .finally(() => setIsLoadingTimeline(false));
    };

    const refreshActions = (orderId: string) => {
        setIsLoadingActions(true);
        getPendingFrankActions('order', orderId)
            .then(data => setPendingActions(data))
            .catch(console.error)
            .finally(() => setIsLoadingActions(false));
    };

    const handleApproveAction = async (actionId: string, updatedPayload: any) => {
        const res = await approveAndExecuteFrankAction(actionId, updatedPayload);
        if (selectedOrder && res.success) {
            refreshActions(selectedOrder.id);
            refreshTimeline(selectedOrder.id);
        }
        return res;
    };

    const handleRejectAction = async (actionId: string) => {
        const res = await rejectFrankAction(actionId);
        if (selectedOrder && res.success) {
            refreshActions(selectedOrder.id);
        }
        return res;
    };

    const handleBulkActionPreview = (actionType: 'approve' | 'cancel' | 'assign') => {
        const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k]);
        if (selectedIds.length === 0) return;

        const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
        
        const previewItems: BulkPreviewItem[] = selectedOrders.map(order => {
            let changes: BulkPreviewItem['changes'] = [];
            
            if (actionType === 'approve') {
                changes = [{
                    label: 'Status do Pedido',
                    from: order.status,
                    to: <span className="text-emerald-600 dark:text-emerald-500">processando</span>
                }];
            } else if (actionType === 'assign') {
                changes = [{
                    label: 'Responsável',
                    from: order.owner,
                    to: <span className="text-blue-600 dark:text-blue-500">Julio Cezar</span>
                }];
            } else if (actionType === 'cancel') {
                changes = [{
                    label: 'Status do Pedido',
                    from: order.status,
                    to: <span className="text-rose-600 dark:text-rose-500">cancelado</span>
                }];
            }

            return {
                id: order.id,
                title: `Pedido #${order.id} - ${order.customer.company}`,
                subtitle: `Total: ${order.total}`,
                changes
            };
        });

        const actionConfigMap = {
            approve: {
                title: 'Aprovar Pedidos',
                description: 'Você está prestes a aprovar e enviar os seguintes pedidos para processamento.',
                actionLabel: 'Aprovar Selecionados'
            },
            assign: {
                title: 'Atribuir Responsável',
                description: 'Você está atribuindo os seguintes pedidos para um novo account manager.',
                actionLabel: 'Confirmar Atribuição'
            },
            cancel: {
                title: 'Cancelar Pedidos',
                description: 'Esta ação moverá os pedidos para o status de cancelado.',
                actionLabel: 'Cancelar Selecionados'
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
            if (previewModalConfig.actionType === 'approve') {
                await bulkApproveOrders(itemIds);
            } else if (previewModalConfig.actionType === 'assign') {
                await bulkAssignOrderOwner(itemIds, 'Julio Cezar');
            } else if (previewModalConfig.actionType === 'cancel') {
                await bulkCancelOrders(itemIds);
            }
            
            setRowSelection({});
            setPreviewModalConfig(prev => ({ ...prev, isOpen: false, isExecuting: false }));
        } catch (error) {
            console.error('Falha ao executar ação em lote', error);
            setPreviewModalConfig(prev => ({ ...prev, isExecuting: false }));
        }
    };


    const handleAddNote = async (note: string) => {
        if (!selectedOrder) return;
        await addOperationalNoteAction('order', selectedOrder.id, note);
        refreshTimeline(selectedOrder.id);
    };

    const columns = useMemo<ColumnDef<OrderRecord>[]>(() => [
        {
            accessorKey: 'id',
            header: 'Pedido',
            cell: ({ row }) => <span className="font-semibold text-[hsl(var(--ui-text))]">#{row.original.id}</span>
        },
        {
            accessorKey: 'customer.company',
            header: 'Cliente',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{row.original.customer.company}</span>
                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{row.original.customer.name}</span>
                </div>
            )
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const toneMap: Record<string, "success" | "warning" | "info" | "neutral" | "critical"> = {
                    'aprovado': 'success',
                    'concluido': 'success',
                    'processando': 'info',
                    'em-separacao': 'warning',
                    'faturado': 'success',
                    'cancelado': 'critical',
                };
                return <StatusChip label={row.original.status.replace('-', ' ')} tone={toneMap[row.original.status] || 'neutral'} />;
            }
        },
        {
            accessorKey: 'logistics.carrier',
            header: 'Logistica',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-[hsl(var(--ui-text))]">{row.original.logistics.carrier}</span>
                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{row.original.logistics.logisticsStatus}</span>
                </div>
            )
        },
        {
            accessorKey: 'total',
            header: 'Valor',
            cell: ({ row }) => <span className="font-medium">R$ {row.original.total}</span>
        },
        {
            accessorKey: 'owner',
            header: 'Responsável',
            cell: ({ row }) => <span className="text-[hsl(var(--ui-text-muted))]">{row.original.owner}</span>
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                    <Button title="Enviar Link de Pagamento" variant="ghost" size="icon" className="h-7 w-7 rounded text-[hsl(var(--ui-text-muted))] hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-500 dark:hover:bg-blue-950/30 transition-colors" onClick={() => console.warn('[TODO] Link de Pagamento not wired for order:', row.original.id)}>
                        <Link2 className="h-4 w-4" />
                    </Button>
                    <Button title="Aprovar Pedido" variant="ghost" size="icon" className="h-7 w-7 rounded text-[hsl(var(--ui-text-muted))] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-500 dark:hover:bg-emerald-950/30 transition-colors" onClick={() => console.warn('[TODO] Aprovar not wired for order:', row.original.id)}>
                        <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button title="Faturar" variant="ghost" size="icon" className="h-7 w-7 rounded text-[hsl(var(--ui-text-muted))] hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-500 dark:hover:bg-purple-950/30 transition-colors" onClick={() => console.warn('[TODO] Faturar not wired for order:', row.original.id)}>
                        <Wallet className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ], []);

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Pedidos"
                title="Lista Universal de Pedidos"
                description="Visualização densa e rápida para triagem massiva. Clique em qualquer pedido para inspecionar no painel lateral."
                meta={
                    <>
                        <StatusChip label={`${orders.length} pedidos`} tone="info" />
                        <StatusChip label="universal list view" tone="success" />
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

            <div className="min-h-[70vh] mt-4 flex flex-col">
                <UniversalListView
                    data={filteredOrders}
                    columns={columns}
                    searchPlaceholder="Buscar por ID, Cliente, Resp..."
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    onRowClick={handleSelectOrder}
                    views={[
                        { id: 'tabela', label: 'Tabela Densa', icon: <List className="h-4 w-4" /> },
                    ]}
                    activeView={viewMode}
                    onViewChange={(v) => setViewMode(v as 'tabela' | 'compacta')}
                    enableRowSelection
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                />
            </div>

            <BulkActionBar
                selectedCount={Object.keys(rowSelection).filter(k => rowSelection[k]).length}
                onClearSelection={() => setRowSelection({})}
            >
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleBulkActionPreview('assign')}>
                    <UserPlus className="mr-2 h-3.5 w-3.5" /> Atribuir
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400" onClick={() => handleBulkActionPreview('approve')}>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" onClick={() => handleBulkActionPreview('cancel')}>
                    <XCircle className="mr-2 h-3.5 w-3.5" /> Cancelar
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

            <InspectorDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title={`Pedido #${selectedOrder?.id}`}
                tabs={[
                    { id: 'detalhes', label: 'Detalhes', icon: <FileText className="h-4 w-4" /> },
                    { id: 'timeline', label: 'Timeline', icon: <MessageSquare className="h-4 w-4" /> },
                    { id: 'acoes', label: 'Ações (Frank)', icon: <Zap className="h-4 w-4 text-amber-500" /> }
                ]}
                activeTab={activeDrawerTab}
                onTabChange={handleTabChange}
                footer={selectedOrder && <OrderActions order={selectedOrder} />}
            >
                {selectedOrder && (
                    <div className="flex flex-col gap-8 pb-8 pt-4">
                        {activeDrawerTab === 'detalhes' && (
                            <>
                                <OrderDetail order={selectedOrder} />
                                <OrderCustomerContext order={selectedOrder} />
                                <OrderLogisticsContext logistics={selectedOrder.logistics} orderId={selectedOrder.id} />
                            </>
                        )}
                        {activeDrawerTab === 'timeline' && (
                            <div className="flex flex-col gap-6">
                                <AddNoteForm onSubmit={handleAddNote} placeholder="Adicionar anotação no histórico..." />
                                <OperationalTimelineWidget history={timelineHistory} isLoading={isLoadingTimeline} />
                            </div>
                        )}
                        {activeDrawerTab === 'acoes' && (
                            <div className="flex flex-col gap-6">
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
                                        <p className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Nenhuma sugestão do Frank aguardando revisão para este pedido.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </InspectorDrawer>
        </ShellContainer>
    );
}
