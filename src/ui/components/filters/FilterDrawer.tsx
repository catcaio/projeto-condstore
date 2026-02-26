'use client';

import React, { useState, useEffect } from 'react';
import { FilterSchema } from './filter-schema';
import { Button } from '@/ui/components/button';
import { TextField } from '@/ui/components/text-field';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: FilterSchema;
    onApply: (filters: FilterSchema) => void;
}

export function FilterDrawer({ isOpen, onClose, currentFilters, onApply }: FilterDrawerProps) {
    const [localFilters, setLocalFilters] = useState<FilterSchema>(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [currentFilters, isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    return (
        <div className="relative z-50">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose} />
            <div className={cn(
                "fixed right-0 top-0 bottom-0 w-[400px] max-w-[100vw] bg-[hsl(var(--ui-surface))] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--ui-border))]">
                    <h2 className="text-lg font-semibold text-[hsl(var(--ui-text))]">Filtros Avançados</h2>
                    <button onClick={onClose} className="p-1.5 rounded-md text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-muted))] hover:text-[hsl(var(--ui-text))] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Tipo de Evento</label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                            value={localFilters.type || ''}
                            onChange={e => setLocalFilters({ ...localFilters, type: e.target.value })}
                        >
                            <option value="" className="bg-[hsl(var(--ui-surface))]">Todos</option>
                            <option value="USER_LOGIN" className="bg-[hsl(var(--ui-surface))]">USER_LOGIN</option>
                            <option value="ITEM_UPDATED" className="bg-[hsl(var(--ui-surface))]">ITEM_UPDATED</option>
                            <option value="BILLING_FAILED" className="bg-[hsl(var(--ui-surface))]">BILLING_FAILED</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Status</label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                            value={localFilters.status || ''}
                            onChange={e => setLocalFilters({ ...localFilters, status: e.target.value })}
                        >
                            <option value="" className="bg-[hsl(var(--ui-surface))]">Todos</option>
                            <option value="success" className="bg-[hsl(var(--ui-surface))]">Sucesso</option>
                            <option value="failure" className="bg-[hsl(var(--ui-surface))]">Falha</option>
                            <option value="pending" className="bg-[hsl(var(--ui-surface))]">Pendente</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Ator / Tenant</label>
                        <TextField
                            placeholder="Buscar ator..."
                            value={localFilters.actor || ''}
                            onChange={e => setLocalFilters({ ...localFilters, actor: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Recurso</label>
                        <TextField
                            placeholder="Buscar recurso..."
                            value={localFilters.resource || ''}
                            onChange={e => setLocalFilters({ ...localFilters, resource: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Data Início</label>
                            <TextField
                                type="date"
                                value={localFilters.dateStart || ''}
                                onChange={e => setLocalFilters({ ...localFilters, dateStart: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Data Fim</label>
                            <TextField
                                type="date"
                                value={localFilters.dateEnd || ''}
                                onChange={e => setLocalFilters({ ...localFilters, dateEnd: e.target.value })}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[hsl(var(--ui-border))] flex gap-3 bg-[hsl(var(--ui-surface))]">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" className="flex-1" onClick={handleApply}>Aplicar Filtros</Button>
                </div>
            </div>
        </div>
    );
}
