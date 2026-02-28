'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Trash, Cloud, HardDrive } from 'lucide-react';
import { safeFetch } from '@/ui/lib/safe-fetch';

interface SavedView<T = Record<string, any>> {
    id?: string;
    name: string;
    filters: T;
    updatedAt: string;
    source?: 'server' | 'local';
}

interface SavedViewsProps<T = Record<string, any>> {
    currentFilters: T;
    onApplyView: (filters: T) => void;
    storageKey?: string;
    module?: 'audit' | 'acquisition' | 'acquisition_drilldown';
}

const DEFAULT_STORAGE_KEY = 'condstore.savedViews.audit';

export function SavedViews<T extends Record<string, any>>({
    currentFilters,
    onApplyView,
    storageKey = DEFAULT_STORAGE_KEY,
    module
}: SavedViewsProps<T>) {
    const [views, setViews] = useState<SavedView<T>[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isServerMode, setIsServerMode] = useState(false);

    const loadLocal = () => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setViews(parsed.map((v: any) => ({ ...v, source: 'local' })));
            } catch (e) {
                console.error("Failed to parse local saved views", e);
            }
        }
    };

    useEffect(() => {
        if (!module) {
            loadLocal();
            return;
        }

        const fetchServer = async () => {
            try {
                const res = await safeFetch(`/api/cockpit/saved-views?module=${module}`);
                const data = await res.json();
                if (data.success) {
                    setIsServerMode(true);
                    setViews(data.views.map((v: any) => ({ ...v, source: 'server' })));
                } else {
                    loadLocal();
                }
            } catch {
                loadLocal();
            }
        };

        fetchServer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [module, storageKey]);

    const saveLocal = (newViews: SavedView<T>[]) => {
        setViews(newViews);
        localStorage.setItem(storageKey, JSON.stringify(newViews));
    };

    const handleSaveView = async () => {
        if (!saveName.trim()) return;
        setIsSaving(true);

        const newView: SavedView<T> = {
            name: saveName.trim(),
            filters: currentFilters,
            updatedAt: new Date().toISOString(),
            source: 'local'
        };

        if (module && isServerMode) {
            try {
                const res = await safeFetch('/api/cockpit/saved-views', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module, name: saveName.trim(), filters: currentFilters })
                });
                const data = await res.json();

                if (data.success) {
                    setViews(prev => [data.view, ...prev].slice(0, 25));
                    setSaveName('');
                    setIsSaving(false);
                    return;
                }
            } catch (e) {
                console.warn("Failed to save view on server, falling back to local storage", e);
            }
        }

        // Fallback to local
        const newViews = [newView, ...views].filter(v => v.source === 'local').slice(0, 10);
        saveLocal(newViews);
        setSaveName('');
        setIsSaving(false);
    };

    const handleDeleteView = async (view: SavedView<T>, e: React.MouseEvent) => {
        e.stopPropagation();

        if (view.source === 'server' && view.id) {
            try {
                const res = await safeFetch(`/api/cockpit/saved-views?id=${view.id}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.success) {
                    setViews(views.filter(v => v.id !== view.id));
                }
            } catch (err) {
                console.error("Failed to delete from server", err);
            }
        } else {
            saveLocal(views.filter(v => v.name !== view.name));
        }
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
                            <div className="p-3 border-b border-[hsl(var(--ui-border))] bg-gradient-to-b from-[hsl(var(--ui-surface))] to-[hsl(var(--ui-muted))]">
                                <input
                                    className="w-full text-sm h-8 px-2 border border-[hsl(var(--ui-border))] rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] text-[hsl(var(--ui-text))] mb-2"
                                    placeholder="Nome da view..."
                                    value={saveName}
                                    onChange={e => setSaveName(e.target.value)}
                                    // eslint-disable-next-line jsx-a11y/no-autofocus
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveView} className="flex-1 bg-[hsl(var(--ui-accent-blue))] text-white text-xs rounded h-6 inline-flex items-center justify-center font-medium shadow-sm transition-transform active:scale-95">Salvar</button>
                                    <button onClick={() => setIsSaving(false)} className="flex-1 bg-transparent border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface))] transition-colors text-xs rounded h-6 inline-flex items-center justify-center font-medium">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2 border-b border-[hsl(var(--ui-border))]">
                                <button
                                    className="w-full text-left text-xs bg-[hsl(var(--ui-accent-blue))/10] text-[hsl(var(--ui-accent-blue))] font-medium hover:bg-[hsl(var(--ui-accent-blue))/20] transition-colors rounded p-2"
                                    onClick={() => setIsSaving(true)}
                                >
                                    + Salvar filtros atuais
                                </button>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto py-1">
                            {views.length === 0 ? (
                                <div className="p-4 text-xs text-center text-[hsl(var(--ui-text-muted))] flex flex-col items-center gap-2">
                                    <Bookmark className="w-6 h-6 opacity-20" />
                                    Nenhuma view salva
                                </div>
                            ) : (
                                views.map((v, i) => (
                                    <div
                                        key={i}
                                        className="group relative flex items-center justify-between px-3 py-2.5 hover:bg-[hsl(var(--ui-muted))] cursor-pointer text-sm text-[hsl(var(--ui-text))] transition-colors"
                                        onClick={() => {
                                            onApplyView(v.filters);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-6">
                                            {v.source === 'server' ? (
                                                <Cloud className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--ui-accent-blue))]" />
                                            ) : (
                                                <HardDrive className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--ui-text-muted))]" />
                                            )}
                                            <span className="truncate flex-1 font-medium text-[hsl(var(--ui-text))]">{v.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteView(v, e)}
                                            className="absolute right-3 opacity-0 group-hover:opacity-100 text-[hsl(var(--ui-danger))] hover:text-red-600 focus:opacity-100 bg-[hsl(var(--ui-muted))] p-1 rounded-sm shadow-sm hover:bg-[var(--bg-app)] transition-all transform scale-95 hover:scale-100"
                                            aria-label="Deletar view"
                                        >
                                            <Trash className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="bg-[hsl(var(--ui-muted))] border-t border-[hsl(var(--ui-border))] p-1.5 flex justify-center text-[0.65rem] text-[hsl(var(--ui-text-muted))] uppercase tracking-wider font-semibold">
                            Storage: {isServerMode ? 'Server (25 máx)' : 'Local (10 máx)'}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
