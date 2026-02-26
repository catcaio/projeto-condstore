'use client';

import React, { useState, useEffect } from 'react';
import { FilterSchema } from './filter-schema';
import { Bookmark, Trash } from 'lucide-react';

interface SavedView {
    name: string;
    filters: FilterSchema;
    updatedAt: string;
}

interface SavedViewsProps {
    currentFilters: FilterSchema;
    onApplyView: (filters: FilterSchema) => void;
}

const STORAGE_KEY = 'condstore.savedViews.audit';

export function SavedViews({ currentFilters, onApplyView }: SavedViewsProps) {
    const [views, setViews] = useState<SavedView[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setViews(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved views", e);
            }
        }
    }, []);

    const saveViews = (newViews: SavedView[]) => {
        setViews(newViews);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newViews));
    };

    const handleSaveView = () => {
        if (!saveName.trim()) return;
        const newView: SavedView = {
            name: saveName.trim(),
            filters: currentFilters,
            updatedAt: new Date().toISOString()
        };
        const newViews = [newView, ...views].slice(0, 10);
        saveViews(newViews);
        setSaveName('');
        setIsSaving(false);
    };

    const handleDeleteView = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        saveViews(views.filter(v => v.name !== name));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 px-4 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:bg-[hsl(var(--ui-muted))] text-sm font-medium text-[hsl(var(--ui-text))]"
            >
                <Bookmark className="w-4 h-4" />
                Views
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-12 left-0 w-64 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-md shadow-lg z-40 overflow-hidden">

                        {isSaving ? (
                            <div className="p-3 border-b border-[hsl(var(--ui-border))]">
                                <input
                                    className="w-full text-sm h-8 px-2 border border-[hsl(var(--ui-border))] rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-text))] mb-2"
                                    placeholder="Nome da view..."
                                    value={saveName}
                                    onChange={e => setSaveName(e.target.value)}
                                    // eslint-disable-next-line jsx-a11y/no-autofocus
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveView} className="flex-1 bg-[hsl(var(--ui-accent-blue))] text-white text-xs rounded h-6 inline-flex items-center justify-center font-medium">Salvar</button>
                                    <button onClick={() => setIsSaving(false)} className="flex-1 bg-transparent border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))] text-xs rounded h-6 inline-flex items-center justify-center font-medium">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2 border-b border-[hsl(var(--ui-border))]">
                                <button
                                    className="w-full text-left text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline p-1"
                                    onClick={() => setIsSaving(true)}
                                >
                                    + Salvar filtros atuais
                                </button>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto py-1">
                            {views.length === 0 ? (
                                <div className="p-3 text-xs text-center text-[hsl(var(--ui-text-muted))]">
                                    Nenhuma view salva
                                </div>
                            ) : (
                                views.map((v, i) => (
                                    <div
                                        key={i}
                                        className="group flex items-center justify-between px-3 py-2 hover:bg-[hsl(var(--ui-muted))] cursor-pointer text-sm text-[hsl(var(--ui-text))]"
                                        onClick={() => {
                                            onApplyView(v.filters);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Bookmark className="w-3 h-3 text-[hsl(var(--ui-text-muted))]" />
                                            <span className="truncate max-w-[140px]">{v.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteView(v.name, e)}
                                            className="opacity-0 group-hover:opacity-100 text-[hsl(var(--ui-danger))] hover:text-red-600 focus:opacity-100"
                                            aria-label="Deletar view"
                                        >
                                            <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
