'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Search,
    RefreshCw,
    ShieldAlert,
    UserCheck,
    MessageSquare,
    Truck,
    Package,
    ChevronRight,
    Zap,
    Filter,
} from 'lucide-react';
import { Button } from '@/ui/components';
import { StatusChip } from '@/ui/foundation';
import type { CockpitDataBundle } from '../data/shared';

export interface CockpitWorkspaceShellProps {
    data: CockpitDataBundle;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export function CockpitWorkspaceShell({ data, onRefresh, isLoading }: CockpitWorkspaceShellProps) {
    const [selectedTab, setSelectedTab] = useState<'all' | 'conversations' | 'freight' | 'orders'>('all');
    const [activeItemId, setActiveItemId] = useState<string | null>(null);

    const metrics = data.derived?.metricsSnapshot ?? {
        activeConversationCount: 0,
        unansweredConversationCount: 0,
        processingOrderCount: 0,
        pendingOrdersCount: 0,
        simulationsToday: 0,
        pendingFreightCount: 0,
        errorsAndExceptions: 0,
        activeIncidentCount: 0,
        failedDomineEventsCount: 0,
        failedWebhookEventsCount: 0,
        criticalSystemCount: 0,
    };
    const queueItems = data.queue ?? [];
    const alerts = data.alerts ?? [];
    const isRealData = data.meta.source === 'real';

    // Filter queue based on tab selection defensively
    const filteredQueue = queueItems.filter((item) => {
        const queueName = (item.queue ?? '').toLowerCase();
        const entityName = (item.entity ?? '').toLowerCase();
        if (selectedTab === 'conversations') {
            return queueName.includes('conversa') || queueName.includes('atendimento') || entityName.includes('contato');
        }
        if (selectedTab === 'freight') {
            return queueName.includes('frete') || queueName.includes('cotaç') || entityName.includes('cot');
        }
        if (selectedTab === 'orders') {
            return queueName.includes('pedido') || entityName.includes('pedido');
        }
        return true;
    });

    const activeItem = queueItems.find((i) => i.id === activeItemId) || queueItems[0];

    return (
        <div className="min-h-screen bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] flex flex-col font-sans">
            {/* Top Operational Header */}
            <header className="sticky top-0 z-30 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))/0.95] backdrop-blur px-4 sm:px-6 py-3">
                <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[hsl(var(--ui-accent-blue-ink))] text-white flex items-center justify-center font-bold text-sm tracking-widest shadow-sm">
                            CS
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                    Área de Trabalho Operacional
                                </h1>
                                <StatusChip
                                    label={isRealData ? 'Operação em Tempo Real' : 'Modo Diagnóstico'}
                                    tone={isRealData ? 'success' : 'warning'}
                                />
                            </div>
                            <p className="text-xs text-[hsl(var(--ui-text-subtle))]">
                                CONDSTORE OS — Fila de trabalho viva e contexto persistente
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <div className="hidden md:flex items-center gap-2 bg-[hsl(var(--ui-page))] border border-[hsl(var(--ui-border))] rounded-lg px-3 py-1.5 text-xs text-[hsl(var(--ui-text-subtle))] w-64 shadow-inner">
                            <Search className="h-3.5 w-3.5" />
                            <span>Buscar conversa, pedido ou cotação...</span>
                            <kbd className="ml-auto font-mono text-[10px] bg-[hsl(var(--ui-surface))] border rounded px-1">⌘K</kbd>
                        </div>

                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="p-2 text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-hover))] rounded-lg border border-[hsl(var(--ui-border))] transition-colors disabled:opacity-50"
                                title="Atualizar dados operacionais"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {!isRealData && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 sm:px-6 py-2 text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>
                        Modo Fallback Ativo (Diagnostico): source=fallback | fallbackReason={data.meta.fallbackReason ?? 'none'} | partialBlocks=[{data.meta.partialBlocks.join(', ')}]
                    </span>
                </div>
            )}

            {/* Quick Context / Attention Strip */}
            <div className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-4 sm:px-6 py-2.5">
                <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                        <span className="text-[hsl(var(--ui-text-subtle))] uppercase tracking-wider font-semibold text-[10px]">
                            Atenção Imediata:
                        </span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{metrics.unansweredConversationCount} sem resposta</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Truck className="h-3.5 w-3.5" />
                            <span>{metrics.pendingFreightCount} cotações pendentes</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Package className="h-3.5 w-3.5" />
                            <span>{metrics.processingOrderCount} em esteira</span>
                        </div>
                        {metrics.errorsAndExceptions > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{metrics.errorsAndExceptions} exceções</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-[hsl(var(--ui-text-subtle))]">Atalhos:</span>
                        <Link href="/conversas" className="text-[hsl(var(--ui-accent-blue-ink))] font-medium hover:underline">
                            Atendimento
                        </Link>
                        <span className="text-[hsl(var(--ui-border))]">•</span>
                        <Link href="/logistica" className="text-[hsl(var(--ui-accent-blue-ink))] font-medium hover:underline">
                            Cotação & Frete
                        </Link>
                        <span className="text-[hsl(var(--ui-border))]">•</span>
                        <Link href="/pedidos" className="text-[hsl(var(--ui-accent-blue-ink))] font-medium hover:underline">
                            Pedidos
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Operational Body: Workspace Grid */}
            <main className="flex-1 mx-auto max-w-7xl w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Area: Operational Queue & Thread (8 Cols) */}
                <section className="lg:col-span-8 space-y-4">
                    {/* Filter Tabs & Queue Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[hsl(var(--ui-surface))] p-3 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm">
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                            <button
                                onClick={() => setSelectedTab('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedTab === 'all'
                                        ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                                        : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                                }`}
                            >
                                Todas as Filas ({queueItems.length})
                            </button>
                            <button
                                onClick={() => setSelectedTab('conversations')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedTab === 'conversations'
                                        ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                                        : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                                }`}
                            >
                                Conversas & WhatsApp
                            </button>
                            <button
                                onClick={() => setSelectedTab('freight')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedTab === 'freight'
                                        ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                                        : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                                }`}
                            >
                                Cotações de Frete
                            </button>
                            <button
                                onClick={() => setSelectedTab('orders')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedTab === 'orders'
                                        ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                                        : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                                }`}
                            >
                                Esteira de Pedidos
                            </button>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[hsl(var(--ui-text-subtle))]">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            <span>Ação antes de navegação</span>
                        </div>
                    </div>

                    {/* Active Alerts Banner if Critical */}
                    {alerts.filter((a) => a.priority === 'critical' || a.priority === 'warning').length > 0 && (
                        <div className="space-y-2">
                            {alerts.slice(0, 2).map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                                        alert.priority === 'critical'
                                            ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                                        <div>
                                            <span className="font-bold">{alert.title}</span>
                                            <p className="mt-0.5 opacity-90">{alert.description}</p>
                                        </div>
                                    </div>
                                    {alert.href && (
                                        <Link href={alert.href}>
                                            <Button size="sm" variant="secondary" className="shrink-0 text-xs">
                                                Resolver
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Work Queue Table / List */}
                    <div className="bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))] shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-[hsl(var(--ui-border))] flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue-ink))]" />
                                Fila Operacional Requerendo Atenção
                            </h2>
                            <span className="text-xs font-mono text-[hsl(var(--ui-text-subtle))]">
                                {filteredQueue.length} itens ativos
                            </span>
                        </div>

                        {filteredQueue.length === 0 ? (
                            <div className="p-8 text-center space-y-3">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                                <div>
                                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Tudo limpo nesta fila</p>
                                    <p className="text-xs text-[hsl(var(--ui-text-subtle))]">
                                        Nenhuma pendência prioritária no momento para a categoria selecionada.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-[hsl(var(--ui-border))]">
                                {filteredQueue.map((item) => {
                                    const isSelected = activeItem?.id === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setActiveItemId(item.id)}
                                            className={`p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-[hsl(var(--ui-page))] border-l-4 border-l-[hsl(var(--ui-accent-blue-ink))]'
                                                    : 'hover:bg-[hsl(var(--ui-page))/0.5]'
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[hsl(var(--ui-text))]">
                                                        {item.entity}
                                                    </span>
                                                    <StatusChip
                                                        label={item.priority}
                                                        tone={
                                                            item.priority === 'critical'
                                                                ? 'critical'
                                                                : item.priority === 'warning'
                                                                ? 'warning'
                                                                : 'info'
                                                        }
                                                    />
                                                    <span className="text-[11px] font-mono text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] px-1.5 py-0.5 rounded">
                                                        {item.queue}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[hsl(var(--ui-text-subtle))]">
                                                    Aguardando: <strong className="text-[hsl(var(--ui-text))] font-medium">{item.waitingFor}</strong> • Aging: {item.age}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                <span className="text-xs text-[hsl(var(--ui-text-subtle))] hidden md:inline">
                                                    {item.owner}
                                                </span>
                                                <Link href={item.href}>
                                                    <Button size="sm" variant={isSelected ? 'primary' : 'secondary'}>
                                                        <span>Agir agora</span>
                                                        <ArrowRight className="h-3 w-3 ml-1" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Area: Context Panel / Item Focus (4 Cols) */}
                <aside className="lg:col-span-4 space-y-4">
                    <div className="bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))] p-4 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue-ink))]" />
                                Contexto Persistente
                            </h3>
                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                                Item Selecionado
                            </span>
                        </div>

                        {activeItem ? (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                                        Fila & Identificação
                                    </span>
                                    <p className="text-sm font-bold text-[hsl(var(--ui-text))]">{activeItem.entity}</p>
                                    <p className="text-xs text-[hsl(var(--ui-text-subtle))]">{activeItem.queue}</p>
                                </div>

                                <div className="p-3 bg-[hsl(var(--ui-page))] rounded-lg border border-[hsl(var(--ui-border))] space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[hsl(var(--ui-text-subtle))]">Ponto de Bloqueio:</span>
                                        <span className="font-semibold text-[hsl(var(--ui-text))]">{activeItem.waitingFor}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[hsl(var(--ui-text-subtle))]">Tempo em Fila:</span>
                                        <span className="font-mono text-[hsl(var(--ui-text))]">{activeItem.age}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[hsl(var(--ui-text-subtle))]">Atribuído a:</span>
                                        <span className="text-[hsl(var(--ui-text))]">{activeItem.owner}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                                        Fio de Continuidade
                                    </span>
                                    <div className="text-xs space-y-1.5 text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] p-3 rounded-lg border border-[hsl(var(--ui-border))]">
                                        <div className="flex items-center gap-2 text-[hsl(var(--ui-text))] font-medium">
                                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                            <span>Atendimento conectado</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[hsl(var(--ui-text))] font-medium">
                                            <Truck className="h-3.5 w-3.5 text-amber-500" />
                                            <span>Cotação rápida associada</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[hsl(var(--ui-text-subtle))]">
                                            <Package className="h-3.5 w-3.5" />
                                            <span>Aguardando conversão para pedido</span>
                                        </div>
                                    </div>
                                </div>

                                <Link href={activeItem.href} className="block">
                                    <Button className="w-full justify-center">
                                        Acessar Contexto Completo
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <p className="text-xs text-[hsl(var(--ui-text-subtle))] py-4 text-center">
                                Selecione um item na fila para visualizar o contexto persistente.
                            </p>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}
