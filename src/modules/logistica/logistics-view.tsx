'use client';

import Link from 'next/link';
import { Button } from '@/ui/components';
import { PageHeader, ShellContainer, StatusChip, UniversalListView, BulkActionBar, InspectorDrawer, SavedViewsTabs, OperationalTimelineWidget, AddNoteForm } from '@/ui/foundation';
import { getOperationalHistoryAction, addOperationalNoteAction } from '@/modules/audit/audit.actions';
import { getPendingFrankActions, approveAndExecuteFrankAction, rejectFrankAction } from '@/modules/frank/actions/review';
import { ActionPlayground } from '@/ui/frank/action-playground';
import { BulkActionPreviewModal, BulkPreviewItem } from '@/ui/foundation/bulk-action-preview-modal';
import { Truck, MapPin, AlertTriangle, Calculator, FileText, MessageSquare, Zap, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

export function LogisticsView() {
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeDrawerTab, setActiveDrawerTab] = useState('detalhes');
    const [selectedId, setSelectedId] = useState<string | null>(null);
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
        actionType: 'update' | 'exception' | null;
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

    const refreshTimeline = (id: string) => {
        setIsLoadingTimeline(true);
        getOperationalHistoryAction('shipment', id)
            .then(data => setTimelineHistory(data))
            .catch(console.error)
            .finally(() => setIsLoadingTimeline(false));
    };

    const refreshActions = (id: string) => {
        setIsLoadingActions(true);
        getPendingFrankActions('shipment', id)
            .then(data => setPendingActions(data))
            .catch(console.error)
            .finally(() => setIsLoadingActions(false));
    };

    const handleApproveAction = async (actionId: string, updatedPayload: any) => {
        const res = await approveAndExecuteFrankAction(actionId, updatedPayload);
        if (selectedId && res.success) {
            refreshActions(selectedId);
            refreshTimeline(selectedId);
        }
        return res;
    };

    const handleRejectAction = async (actionId: string) => {
        const res = await rejectFrankAction(actionId);
        if (selectedId && res.success) {
            refreshActions(selectedId);
        }
        return res;
    };

    const handleBulkActionPreview = (actionType: 'update' | 'exception') => {
        const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k]);
        if (selectedIds.length === 0) return;

        const previewItems: BulkPreviewItem[] = selectedIds.map(id => {
            let changes: BulkPreviewItem['changes'] = [];
            
            if (actionType === 'update') {
                changes = [{
                    label: 'Tracking',
                    from: 'não atualizado',
                    to: <span className="text-emerald-600 dark:text-emerald-500">sincronizado hoje</span>
                }];
            } else if (actionType === 'exception') {
                changes = [{
                    label: 'Status',
                    from: 'regular',
                    to: <span className="text-rose-600 dark:text-rose-500">exceção pendente</span>
                }];
            }

            return {
                id,
                title: `Remessa de Logística ID: ${id}`,
                subtitle: `Forçando sincronização e regras de notificação`,
                changes
            };
        });

        const actionConfigMap = {
            update: {
                title: 'Atualizar Tracking (Forçado)',
                description: 'Você está prestes a forçar a checagem manual de tracking para as remessas.',
                actionLabel: 'Sincronizar Selecionados'
            },
            exception: {
                title: 'Reportar Exceção Manual',
                description: 'Isto sinaliza uma ocorrência de transporte para análise e pausa SLAs.',
                actionLabel: 'Reportar Exceção'
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
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Call actual Server Action here
            
            setRowSelection({});
            setPreviewModalConfig(prev => ({ ...prev, isOpen: false, isExecuting: false }));
        } catch (error) {
            console.error('Falha ao executar ação em lote', error);
            setPreviewModalConfig(prev => ({ ...prev, isExecuting: false }));
        }
    };

    return (
        <ShellContainer>
            <PageHeader
                eyebrow="Logistica"
                title="Central operacional de logistica"
                description="Fila viva para cotacao, SLA, tracking, excecoes e intervencao humana, conectada a pedido, cliente e conversa."
                meta={
                    <>
                        <StatusChip label="fila logistica real" tone="success" />
                        <StatusChip label="sem dados simulados" tone="info" />
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

            <div className="min-h-[70vh] flex flex-col mt-4">
                <UniversalListView
                    data={[]} // Em breve
                    columns={[
                        { accessorKey: 'id', header: 'Código' },
                        { accessorKey: 'order', header: 'Pedido' },
                        { accessorKey: 'carrier', header: 'Transportadora' },
                        { accessorKey: 'status', header: 'Status' },
                        { accessorKey: 'sla', header: 'SLA' },
                        { 
                            id: 'actions', 
                            header: '', 
                            cell: () => (
                                <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                    <Button title="Cotar Frete" variant="ghost" size="icon" className="h-7 w-7 rounded text-[hsl(var(--ui-text-muted))] hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-500 dark:hover:bg-blue-950/30 transition-colors" onClick={() => console.warn('[TODO] Cotar Frete not wired')}>
                                        <Calculator className="h-4 w-4" />
                                    </Button>
                                    <Button title="Atualizar Tracking" variant="ghost" size="icon" className="h-7 w-7 rounded text-[hsl(var(--ui-text-muted))] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-500 dark:hover:bg-emerald-950/30 transition-colors" onClick={() => console.warn('[TODO] Atualizar Tracking not wired')}>
                                        <MapPin className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        },
                    ]}
                    searchPlaceholder="Buscar por conhecimento ou remessa..."
                    views={[{ id: 'tabela', label: 'Tabela Densa', icon: <Truck className="h-4 w-4" /> }]}
                    activeView="tabela"
                    enableRowSelection
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    onRowClick={(row: any) => {
                        setSelectedId(row.id as string);
                        setIsDrawerOpen(true);
                        setActiveDrawerTab('detalhes');
                        setIsDrawerOpen(true);
                        setActiveDrawerTab('detalhes');
                        refreshTimeline(row.id as string);
                    }}
                />
            </div>

            <BulkActionBar
                selectedCount={Object.keys(rowSelection).filter(k => rowSelection[k]).length}
                onClearSelection={() => setRowSelection({})}
            >
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleBulkActionPreview('update')}>
                    <MapPin className="mr-2 h-3.5 w-3.5" /> Atualizar Tracking
                </Button>
                <Button variant="secondary" size="sm" className="h-8 rounded-full text-xs text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400" onClick={() => handleBulkActionPreview('exception')}>
                    <AlertTriangle className="mr-2 h-3.5 w-3.5" /> Reportar Exceção
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
                title={`Logística #${selectedId ?? ''}`}
                tabs={[
                    { id: 'detalhes', label: 'Detalhes', icon: <FileText className="h-4 w-4" /> },
                    { id: 'timeline', label: 'Timeline', icon: <MessageSquare className="h-4 w-4" /> },
                    { id: 'acoes', label: 'Ações (Frank)', icon: <Zap className="h-4 w-4 text-amber-500" /> }
                ]}
                activeTab={activeDrawerTab}
                onTabChange={(tabId) => {
                    setActiveDrawerTab(tabId);
                    if (tabId === 'timeline' && selectedId) {
                        refreshTimeline(selectedId);
                    }
                    if (tabId === 'acoes' && selectedId) {
                        refreshActions(selectedId);
                    }
                }}
            >
                <div className="flex flex-col gap-8 pb-8 pt-4">
                    {activeDrawerTab === 'detalhes' && (
                        <div className="flex items-center justify-center p-8 text-sm text-[hsl(var(--ui-text-muted))] border border-dashed border-[hsl(var(--ui-border))] rounded-2xl mx-1">
                            Detalhes da cotação e transporte serão exibidos aqui.
                        </div>
                    )}
                    {activeDrawerTab === 'timeline' && (
                        <div className="flex flex-col gap-6">
                            <AddNoteForm 
                                onSubmit={async (note) => {
                                    if (!selectedId) return;
                                    await addOperationalNoteAction('shipment', selectedId, note);
                                    refreshTimeline(selectedId);
                                }} 
                                placeholder="Adicionar registro na logística..." 
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
                                    <p className="text-xs text-[hsl(var(--ui-text-subtle))] mt-1">Nenhuma sugestão do Frank aguardando revisão para esta logística.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </InspectorDrawer>
        </ShellContainer>
    );
}

