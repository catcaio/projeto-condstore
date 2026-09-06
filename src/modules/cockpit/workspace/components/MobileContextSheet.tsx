'use client';

import React from 'react';
import Link from 'next/link';
import { UserCheck, ChevronRight, X } from 'lucide-react';
import { Button } from '@/ui/components';
import type { CockpitActionQueueItem } from '../../data/shared';

export interface MobileContextSheetProps {
    isOpen: boolean;
    activeItem: CockpitActionQueueItem | null;
    onClose: () => void;
}

export function MobileContextSheet({ isOpen, activeItem, onClose }: MobileContextSheetProps) {
    if (!isOpen || !activeItem) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs">
            <div className="bg-[hsl(var(--ui-surface))] rounded-t-2xl border-t border-[hsl(var(--ui-border))] p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue-ink))]" />
                        Contexto Persistente (Mobile)
                    </h3>
                    <button
                        type="button"
                        aria-label="Fechar gaveta de contexto"
                        onClick={onClose}
                        className="p-1 text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] rounded transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                            Fila & Identificação
                        </span>
                        <p className="text-sm font-bold text-[hsl(var(--ui-text))]">{activeItem.entity}</p>
                        <p className="text-xs text-[hsl(var(--ui-text-subtle))]">{activeItem.queue}</p>
                    </div>

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

                    <Link href={activeItem.href} className="block" onClick={onClose}>
                        <Button className="w-full justify-center">
                            Acessar Contexto Completo
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
