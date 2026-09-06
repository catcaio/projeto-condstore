'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserCheck, ChevronRight, X, Loader2, CheckCircle2, AlertCircle, Bot } from 'lucide-react';
import { Button } from '@/ui/components';
import type { CockpitActionQueueItem, WorkItemAction } from '../../data/shared';
import { OperationalThreadView } from './OperationalThreadView';

export interface MobileContextSheetProps {
    isOpen: boolean;
    activeItem: CockpitActionQueueItem | null;
    onClose: () => void;
    onExecuteAction?: (action: WorkItemAction, item: CockpitActionQueueItem) => Promise<void>;
}

export function MobileContextSheet({
    isOpen,
    activeItem,
    onClose,
    onExecuteAction,
}: MobileContextSheetProps) {
    const [executingActionId, setExecutingActionId] = useState<string | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    if (!isOpen || !activeItem) return null;

    const handleActionClick = async (action: WorkItemAction) => {
        if (action.type === 'link' && action.href) {
            onClose();
            return;
        }

        if (!onExecuteAction) return;

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
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs">
            <div className="bg-[hsl(var(--ui-surface))] rounded-t-2xl border-t border-[hsl(var(--ui-border))] p-5 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
                {/* Mobile Drag Handle Bar */}
                <div className="w-12 h-1.5 bg-[hsl(var(--ui-border))] rounded-full mx-auto -mt-1 mb-1" />

                <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-[hsl(var(--ui-accent-blue-ink))]" />
                        Contexto Operacional (Mobile)
                    </h3>
                    <button
                        type="button"
                        aria-label="Fechar gaveta de contexto"
                        onClick={onClose}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] rounded transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                            Fila Operacional
                        </span>
                        <p className="text-base font-bold text-[hsl(var(--ui-text))]">{activeItem.entity}</p>
                        <p className="text-xs text-[hsl(var(--ui-text-subtle))]">{activeItem.queue}</p>
                    </div>

                    {/* Operational Thread Stepper */}
                    <OperationalThreadView item={activeItem} />

                    <div className="p-3 bg-[hsl(var(--ui-page))] rounded-lg border border-[hsl(var(--ui-border))] space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-[hsl(var(--ui-text-subtle))]">Ponto de Bloqueio:</span>
                            <span className="font-semibold text-[hsl(var(--ui-text))]">{activeItem.waitingFor}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[hsl(var(--ui-text-subtle))]">Tempo em Fila:</span>
                            <span className="font-mono text-[hsl(var(--ui-text))]">{activeItem.age}</span>
                        </div>
                    </div>

                    {/* Action Feedback Banner */}
                    {actionFeedback && (
                        <div
                            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                                actionFeedback.type === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-800 border-red-500/20'
                            }`}
                        >
                            {actionFeedback.type === 'success' ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            ) : (
                                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                            )}
                            <span className="font-medium text-xs">{actionFeedback.message}</span>
                        </div>
                    )}

                    {/* Available Contextual Actions */}
                    {activeItem.availableActions && activeItem.availableActions.length > 0 && (
                        <div className="space-y-2.5 pt-1 border-t border-[hsl(var(--ui-border))]">
                            <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))] block">
                                Ações Contextuais Disponíveis
                            </span>
                            <div className="space-y-2.5">
                                {activeItem.availableActions.map((action) => {
                                    const isExecuting = executingActionId === action.id;

                                    if (action.type === 'link' && action.href) {
                                        return (
                                            <Link key={action.id} href={action.href} onClick={onClose} className="block">
                                                <Button variant="secondary" className="w-full justify-between text-xs min-h-[44px]">
                                                    <span>{action.label}</span>
                                                    <ChevronRight className="h-4 w-4 ml-1" />
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
                                            className="w-full justify-center text-xs min-h-[44px]"
                                        >
                                            {isExecuting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
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

                    <Link href={activeItem.href} className="block pt-1" onClick={onClose}>
                        <Button variant="secondary" className="w-full justify-center text-xs min-h-[44px]">
                            Acessar Contexto Completo
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
