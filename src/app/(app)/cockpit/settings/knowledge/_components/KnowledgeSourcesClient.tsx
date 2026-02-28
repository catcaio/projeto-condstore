'use client';

import { useState, useEffect } from 'react';
import { SettingsSection } from '@/ui/settings';
import { Button } from '@/ui/components';
import { TextField } from '@/ui/components/text-field';

export function KnowledgeSourcesClient({ tenantId }: { tenantId: string }) {
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newType, setNewType] = useState('faq');
    const [newName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchSources();
    }, [tenantId]);

    async function fetchSources() {
        setLoading(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/knowledge/sources`);
            if (res.ok) {
                const data = await res.json();
                setSources(data.sources || []);
            }
        } catch (error) {
            console.error('Failed to fetch sources');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/knowledge/sources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: newType, name: newName.trim() })
            });
            if (res.ok) {
                setNewName('');
                fetchSources();
            } else {
                alert('Erro ao criar Knowledge Source');
            }
        } catch (error) {
            alert('Falha interna');
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <div className="space-y-6">
            <SettingsSection
                title="Fontes Customizadas (Draft Mode)"
                description="Governança de repositório inteligente do tenant (Pendente integração full Domine Stack)."
            >
                <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-lg flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-[2]">
                            <label className="text-xs text-[hsl(var(--ui-text-muted))] block mb-1">Nome/Apelido da Fonte</label>
                            <TextField
                                type="text"
                                placeholder="Ex: Manual de Condutas"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="flex-[1]">
                            <label className="text-xs text-[hsl(var(--ui-text-muted))] block mb-1">Tipo</label>
                            <select
                                className="w-full h-10 px-3 bg-transparent border border-[hsl(var(--ui-border))] rounded-md text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ui-ring))] disabled:opacity-50 text-[hsl(var(--ui-text))]"
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                            >
                                <option value="faq">FAQ / Q&A</option>
                                <option value="manual">Manual</option>
                                <option value="website">Website URL</option>
                            </select>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleCreate}
                            disabled={isCreating || !newName.trim()}
                        >
                            {isCreating ? 'Criando...' : 'Criar (Draft)'}
                        </Button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[hsl(var(--ui-border)/0.5)]">
                        {loading ? (
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Carregando...</p>
                        ) : sources.length === 0 ? (
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma fonte de conhecimento cadastrada.</p>
                        ) : (
                            <div className="divide-y divide-[hsl(var(--ui-border)/0.5)]">
                                {sources.map(s => (
                                    <div key={s.id} className="py-3 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{s.name}</span>
                                            <span className="text-xs text-[hsl(var(--ui-text-muted))] uppercase tracking-wider">{s.type}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-mono px-2 py-1 bg-[hsl(var(--ui-surface-hover))] rounded border border-[hsl(var(--ui-border))]">
                                                {s.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SettingsSection>
        </div>
    );
}
