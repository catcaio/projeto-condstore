'use client';

import * as React from 'react';
import { Button } from '@/ui/components';
import { X, ArrowRight, AlertTriangle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkPreviewItem {
    id: string;
    title: string;
    subtitle?: string;
    changes: {
        label: string;
        from: React.ReactNode;
        to: React.ReactNode;
    }[];
}

interface BulkActionPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (itemIds: string[]) => void;
    title: string;
    description: string;
    items: BulkPreviewItem[];
    actionLabel?: string;
    isExecuting?: boolean;
}

export function BulkActionPreviewModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    items: initialItems,
    actionLabel = 'Executar Ação',
    isExecuting = false,
}: BulkActionPreviewModalProps) {
    const [selectedItems, setSelectedItems] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (isOpen) {
            // Select all by default when opened
            const sel: Record<string, boolean> = {};
            initialItems.forEach(item => sel[item.id] = true);
            setSelectedItems(sel);
        }
    }, [isOpen, initialItems]);

    if (!isOpen) return null;

    const activeItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    const activeCount = activeItemIds.length;

    const handleConfirm = () => {
        onConfirm(activeItemIds);
    };

    const toggleItem = (id: string) => {
        setSelectedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[hsl(var(--ui-surface))] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 ring-1 ring-black/5 dark:ring-white/10">
                
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-[hsl(var(--ui-border))]">
                    <div>
                        <h2 className="text-xl font-semibold text-[hsl(var(--ui-text))] flex items-center gap-2">
                            <Play className="h-5 w-5 text-blue-500" />
                            {title}
                        </h2>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-1">
                            {description}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] rounded-full hover:bg-[hsl(var(--ui-muted))] transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-[hsl(var(--ui-page))]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-[hsl(var(--ui-text))]">
                            Registros Afetados ({activeCount} selecionados)
                        </h3>
                        {activeCount < initialItems.length && (
                            <span className="text-xs text-amber-600 dark:text-amber-500 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
                                <AlertTriangle className="h-3 w-3" />
                                {initialItems.length - activeCount} ignorado(s)
                            </span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {initialItems.map(item => {
                            const isSelected = selectedItems[item.id];
                            return (
                                <div 
                                    key={item.id} 
                                    className={cn(
                                        "rounded-xl border p-4 transition-all duration-200",
                                        isSelected 
                                            ? "border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm"
                                            : "border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] opacity-60 grayscale-[0.5]"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => toggleItem(item.id)}
                                                    className="w-4 h-4 rounded border-[hsl(var(--ui-border))] text-[hsl(var(--ui-primary))] focus:ring-[hsl(var(--ui-primary))] cursor-pointer shrink-0"
                                                />
                                                <p className="text-sm font-semibold text-[hsl(var(--ui-text))] truncate">{item.title}</p>
                                            </div>
                                            {item.subtitle && (
                                                <p className="text-xs text-[hsl(var(--ui-text-subtle))] mt-0.5 ml-6">{item.subtitle}</p>
                                            )}

                                            <div className="mt-3 ml-6 space-y-2">
                                                {item.changes.map((change, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        <span className="text-[hsl(var(--ui-text-muted))] w-20 shrink-0">{change.label}:</span>
                                                        <span className="px-2 py-0.5 rounded-md bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))] line-through opacity-70">
                                                            {change.from}
                                                        </span>
                                                        <ArrowRight className="h-3 w-3 text-[hsl(var(--ui-text-subtle))]" />
                                                        <span className="px-2 py-0.5 rounded-md bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text))] font-medium border border-[hsl(var(--ui-border))] shadow-sm">
                                                            {change.to}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => toggleItem(item.id)}
                                            className={cn(
                                                "h-7 text-xs px-2 shrink-0",
                                                isSelected ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-950/30" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-950/30"
                                            )}
                                        >
                                            {isSelected ? 'Remover' : 'Incluir'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] flex justify-between items-center">
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        {activeCount === 0 ? 'Nenhum registro selecionado.' : `Aplicando em ${activeCount} registros.`}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={isExecuting}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleConfirm} 
                            disabled={activeCount === 0 || isExecuting}
                            className={cn(isExecuting && "opacity-70 cursor-not-allowed")}
                        >
                            {isExecuting ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    Executando...
                                </span>
                            ) : (
                                actionLabel
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
