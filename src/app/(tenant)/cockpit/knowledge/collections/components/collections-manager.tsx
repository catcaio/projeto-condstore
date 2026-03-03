'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/ui/components';
import { Database, RefreshCw, AlertTriangle, Plus, Download } from 'lucide-react';

function timeAgo(date: Date) {
    const rtf = new Intl.RelativeTimeFormat('pt', { numeric: 'auto' });
    const diff = (date.getTime() - Date.now()) / 1000;
    if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
}

export function CollectionsManager({ metrics }: { metrics: any }) {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionSync, setActionSync] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            const res = await fetch('/api/knowledge/collections');
            if (res.ok) {
                const data = await res.json();
                setCollections(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMockDrive = async () => {
        setError('');
        try {
            const res = await fetch('/api/knowledge/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Google Drive Sync ${Date.now().toString().slice(-4)}`,
                    sourceType: 'integration',
                    connectorType: 'google_drive'
                })
            });
            if (!res.ok) throw new Error(await res.text());
            await fetchCollections();
        } catch (err: any) {
            setError(err.message || 'Falha ao criar conector');
        }
    };

    const handleManualSync = async (id: string, currentlySyncing: boolean) => {
        if (currentlySyncing) return;
        setActionSync(id);
        setError('');
        try {
            const res = await fetch(`/api/knowledge/collections/${id}/sync`, { method: 'POST' });
            if (!res.ok) throw new Error(await res.text());

            // local optimistic update for UI feedback
            setCollections(prev => prev.map(c => c.id === id ? { ...c, syncStatus: 'syncing' } : c));

            // real poll after a wait since it processes offline
            setTimeout(fetchCollections, 5000);
        } catch (err: any) {
            setError(err.message || 'Falha ao acionar sync');
        } finally {
            setActionSync(null);
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-[hsl(var(--ui-surface))] rounded-lg"></div>;

    return (
        <div className="flex flex-col gap-6">
            {error && (
                <div className="bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger-ink))] p-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="flex justify-between items-center bg-[hsl(var(--ui-surface))] p-4 rounded-lg border border-[hsl(var(--ui-border))]">
                <div>
                    <h3 className="font-semibold text-[hsl(var(--ui-text))] flex items-center gap-2">
                        <Database className="w-4 h-4 text-[hsl(var(--ui-accent-blue))]" />
                        Conectores (MVP)
                    </h3>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Criar coleção via Google Drive.</p>
                </div>
                <button onClick={handleCreateMockDrive} className="text-sm font-medium bg-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-accent-blue)/0.9)] text-white px-4 py-2 rounded flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Conta Google Drive
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collections.length === 0 && (
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma coleção configurada.</p>
                )}
                {collections.map(col => (
                    <div key={col.id} className="border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 justify-between flex flex-col rounded-lg hover:border-[hsl(var(--ui-accent-blue)/0.4)] transition-colors relative">

                        <div className="absolute top-4 right-4">
                            {col.syncStatus === 'syncing' && <Badge variant="muted" className="animate-pulse"><RefreshCw className="w-3 h-3 mr-1" /> Sincronizando</Badge>}
                            {col.syncStatus === 'error' && <Badge variant="danger"><AlertTriangle className="w-3 h-3 mr-1" /> Falha</Badge>}
                            {col.syncStatus === 'idle' && <Badge variant="success">Ocioso</Badge>}
                        </div>

                        <div className="mb-4">
                            <h4 className="font-semibold text-base text-[hsl(var(--ui-text))] flex items-center gap-2">
                                {col.name}
                            </h4>
                            <span className="text-xs text-[hsl(var(--ui-text-muted))] block mt-1">
                                Tipo: {col.sourceType} {col.connectorType ? `(${col.connectorType})` : ''}
                            </span>
                            <span className="text-xs text-[hsl(var(--ui-text-muted))] block">
                                Visto: {col.lastSyncAt ? timeAgo(new Date(col.lastSyncAt)) : 'Nunca'}
                            </span>
                        </div>

                        <div className="pt-4 border-t border-[hsl(var(--ui-border))] flex justify-between items-center">
                            <label className="flex items-center gap-2 text-xs text-[hsl(var(--ui-text-muted))] cursor-pointer">
                                <input type="checkbox" checked={col.autoSync} disabled className="rounded text-[hsl(var(--ui-accent-blue))]" />
                                Auto-sync (Daily)
                            </label>

                            {col.sourceType === 'integration' && (
                                <button
                                    onClick={() => handleManualSync(col.id, col.syncStatus === 'syncing')}
                                    disabled={col.syncStatus === 'syncing' || actionSync === col.id}
                                    className="text-sm flex items-center gap-1.5 text-[hsl(var(--ui-accent-blue))] font-medium disabled:opacity-50"
                                >
                                    {actionSync === col.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Puxar Alterações
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
