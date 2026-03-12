'use client';

import React, { useState, useEffect } from 'react';
import { SettingsPage } from '@/ui/settings/settings-page';
import { PlaybookList } from '@/ui/playbooks/playbook-list';
import { PlaybookEditor } from '@/ui/playbooks/playbook-editor';
import { PlaybookDefinition, CreatePlaybookDTO } from '@/modules/playbooks/playbooks.types';
import { Button } from '@/ui/components/button';
import { Plus } from 'lucide-react';

export default function PlaybooksPage() {
    const [playbooks, setPlaybooks] = useState<PlaybookDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlayback, setEditingPlayback] = useState<PlaybookDefinition | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const loadPlaybooks = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cockpit/playbooks');
            const data = await res.json();
            if (data.ok) {
                setPlaybooks(data.data);
            }
        } catch (e) {
            alert('Erro ao listar Playbooks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlaybooks();
    }, []);

    const handleSave = async (data: any) => {
        try {
            if (isCreating) {
                const res = await fetch('/api/cockpit/playbooks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error('Falha ao criar');
            } else if (editingPlayback) {
                const res = await fetch(`/api/cockpit/playbooks/${editingPlayback.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error('Falha ao atualizar');
            }
            
            setIsCreating(false);
            setEditingPlayback(null);
            await loadPlaybooks();
        } catch(e: any) {
            alert(e.message || 'Erro ao salvar playbook');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/cockpit/playbooks/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao excluir');
            alert('Excluído com sucesso');
            await loadPlaybooks();
        } catch (e) {
            alert('Não possível deletar o playbook');
        }
    };

    return (
        <SettingsPage
            title="Playbooks (Workflow Engine)"
            description="Crie formulários, sequenciamentos de ação e fluxos em etapas para estressar negociações em CRM, atendimento e operabilidade."
            headerAction={
                !isCreating && !editingPlayback && (
                    <Button onClick={() => setIsCreating(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Novo Playbook
                    </Button>
                )
            }
        >
            <div className="mt-6">
                {isCreating || editingPlayback ? (
                    <PlaybookEditor 
                        playbook={editingPlayback || undefined}
                        onSave={handleSave} 
                        onCancel={() => {
                            setIsCreating(false);
                            setEditingPlayback(null);
                        }} 
                    />
                ) : (
                    loading ? (
                        <div className="text-sm text-[hsl(var(--ui-text-muted))] py-4">Carregando playbooks...</div>
                    ) : (
                        <PlaybookList 
                            playbooks={playbooks} 
                            onEdit={pb => setEditingPlayback(pb)} 
                            onDelete={handleDelete} 
                        />
                    )
                )}
            </div>
        </SettingsPage>
    );
}
