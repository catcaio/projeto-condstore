'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/ui/components/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterDrawerProps<T extends Record<string, any>> {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: T;
    onApply: (filters: T) => void;
    children: (localFilters: T, setLocalFilters: React.Dispatch<React.SetStateAction<T>>) => React.ReactNode;
}

export function FilterDrawer<T extends Record<string, any>>({ isOpen, onClose, currentFilters, onApply, children }: FilterDrawerProps<T>) {
    const [localFilters, setLocalFilters] = useState<T>(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [currentFilters, isOpen]);

    // Lazy load the content for performance (only render if open)
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen && !shouldRender) setShouldRender(true);
    }, [isOpen, shouldRender]);

    if (!shouldRender) return null;

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    return (
        <div className={cn("relative z-50", !isOpen && "pointer-events-none")}>
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />
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
                    {children(localFilters, setLocalFilters)}
                </div>

                <div className="p-4 border-t border-[hsl(var(--ui-border))] flex gap-3 bg-[hsl(var(--ui-surface))]">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" className="flex-1" onClick={handleApply}>Aplicar Filtros</Button>
                </div>
            </div>
        </div>
    );
}
