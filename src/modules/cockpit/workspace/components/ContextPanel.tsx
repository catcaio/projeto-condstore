'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    UserCheck,
    MessageSquare,
    ChevronRight,
    MousePointerClick,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Bot,
} from 'lucide-react';
import { Button } from '@/ui/components';
import type { CockpitActionQueueItem, WorkItemAction } from '../../data/shared';
import { OperationalThreadView } from './OperationalThreadView';

export interface ContextPanelProps {
    activeItem: CockpitActionQueueItem | null;
    onExecuteAction?: (action: WorkItemAction, item: CockpitActionQueueItem) => Promise<void>;
}

export function ContextPanel({ activeItem, onExecuteAction }: ContextPanelProps) {
    const [executingActionId, setExecutingActionId] = useState<string | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const handleActionClick = async (action: WorkItemAction) => {
        if (action.type === 'link' && action.href) {
            return;
        }

        if (!onExecuteAction || !activeItem) {
            return;
        }

        setExecutingActionId(action.id);
        setActionFeedback(null);

        try {
            await onExecuteAction(action, activeItem);
            setActionFeedback({
                type: 'success',
                message: `Ação "${action.label}" executada com sucesso.`,
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Falha ao executar ação.';
            setActionFeedback({
                type: 'error',
                message: errorMsg,
            });
        } finally {
            setExecutingActionId(null);
        }
    };

    return (
        <aside className="space-y-4">
            <div className="bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))] p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue-ink))]" />
                        Contexto Persistente
                    </h3>
                    {activeItem && (
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Item Selecionado
                        </span>
                    )}
                </div>

                {activeItem ? (
                    <div className="space-y-4">
                        {/* Header & Identification */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                                    Fila Operacional
                                </span>
                                <span className="text-[10px] font-mono uppercase bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text-subtle))] px-1.5 py-0.5 rounded border border-[hsl(var(--ui-border))]">
                                    {activeItem.category}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-[hsl(var(--ui-text))]">{activeItem.entity}</p>
                            <p className="text-xs text-[hsl(var(--ui-text-subtle))]">{activeItem.queue}</p>
                        </div>

                        {/* Relational Operational Thread Stepper */}
                        <OperationalThreadView item={activeItem} />

                        {/* Key Attributes */}
                        <div className="p-3 bg-[hsl(var(--ui-page))] rounded-lg border border-[hsl(var(--ui-border))] space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Ponto de Bloqueio:</span>
                                <span className="font-semibold text-[hsl(var(--ui-text))]">{activeItem.waitingFor}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Tempo em Fila:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{activeItem.age}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Atribuído a:</span>
                                <span className="text-[hsl(var(--ui-text))]">{activeItem.owner}</span>
                            </div>
                        </div>

                        {/* Action Feedback Banner */}
                        {actionFeedback && (
                            <div
                                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                                    actionFeedback.type === 'success'
                                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-800 border-red-500/20'
                                }`}
                            >
                                {actionFeedback.type === 'success' ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                )}
                                <span className="font-medium text-[11px]">{actionFeedback.message}</span>
                            </div>
                        )}

                        {/* Available Contextual Actions */}
                        {activeItem.availableActions && activeItem.availableActions.length > 0 && (
                            <div className="space-y-2 pt-1 border-t border-[hsl(var(--ui-border))]">
                                <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))] block">
                                    Ações Contextuais Disponíveis
                                </span>
                                <div className="space-y-2">
                                    {activeItem.availableActions.map((action) => {
                                        const isExecuting = executingActionId === action.id;

                                        if (action.type === 'link' && action.href) {
                                            return (
                                                <Link key={action.id} href={action.href} className="block">
                                                    <Button variant="secondary" className="w-full justify-between text-xs">
                                                        <span>{action.label}</span>
                                                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                                    </Button>
                                                </Link>
                                            );
                                        }

                                        return (
                                            <Button
                                                key={action.id}
                                                disabled={Boolean(executingActionId)}
                                                onClick={() => handleActionClick(action)}
                                                variant={action.tone === 'danger' ? 'secondary' : 'primary'}
                                                className="w-full justify-center text-xs"
                                            >
                                                {isExecuting ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                        <span>Processando...</span>
                                                    </>
                                                ) : (
                                                    <span>{action.label}</span>
                                                )}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Frank Co-pilot Context Section */}
                        <div className="space-y-2 pt-2 border-t border-[hsl(var(--ui-border))]">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))] flex items-center gap-1">
                                    <Bot className="h-3.5 w-3.5 text-indigo-500" />
                                    IA Frank Supervisionada
                                </span>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    Humano no Loop
                                </span>
                            </div>

                            <div className="text-xs space-y-2 text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] p-3 rounded-lg border border-[hsl(var(--ui-border))]">
                                <p className="text-[11px] text-[hsl(var(--ui-text))] font-medium">
                                    Sugestão contextual do copiloto:
                                </p>
                                <p className="text-[11px] text-[hsl(var(--ui-text-subtle))] italic">
                                    &ldquo;{activeItem.waitingFor}&rdquo;
                                </p>
                                <div className="pt-2 border-t border-[hsl(var(--ui-border))] space-y-1">
                                    <p className="text-[10px] text-[hsl(var(--ui-text-subtle))]">
                                        Etapa Ativa: <strong className="text-[hsl(var(--ui-text))] capitalize">{activeItem.operationalThread.activeStage}</strong>
                                    </p>
                                    {activeItem.operationalThread.blockedStage && (
                                        <p className="text-[10px] text-amber-700 font-medium">
                                            Bloqueio em: <strong className="capitalize">{activeItem.operationalThread.blockedStage}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Deep link */}
                        <Link href={activeItem.href} className="block pt-1">
                            <Button variant="secondary" className="w-full justify-center text-xs">
                                <span>Acessar Módulo em Tela Cheia</span>
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="py-8 px-4 text-center space-y-3 bg-[hsl(var(--ui-page))] rounded-lg border border-dashed border-[hsl(var(--ui-border))]">
                        <MousePointerClick className="h-7 w-7 text-[hsl(var(--ui-text-subtle))] mx-auto opacity-70" />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-[hsl(var(--ui-text))]">Nenhum item selecionado</p>
                            <p className="text-[11px] text-[hsl(var(--ui-text-subtle))]">
                                Clique em um item da fila operacional ao lado para inspecionar seu contexto persistente e thread de trabalho.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
