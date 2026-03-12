'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { PlaybookDefinition, CreatePlaybookDTO, PlaybookEntitySchema } from '@/modules/playbooks/playbooks.types';
import { PlaybookStepEditor } from './playbook-step-editor';

interface PlaybookEditorProps {
    playbook?: PlaybookDefinition;
    onSave: (data: CreatePlaybookDTO | any) => Promise<void>;
    onCancel: () => void;
}

export function PlaybookEditor({ playbook, onSave, onCancel }: PlaybookEditorProps) {
    const [name, setName] = useState(playbook?.name || '');
    const [description, setDescription] = useState(playbook?.description || '');
    const [entity, setEntity] = useState(playbook?.entity || 'conversation');
    const [isActive, setIsActive] = useState(playbook?.isActive ?? true);
    const [steps, setSteps] = useState(playbook?.steps || []);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Nome do playbook é obrigatório');
            return;
        }
        if (steps.length === 0) {
            alert('Adicione no mínimo um passo ao playbook');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                name,
                description,
                entity,
                isActive,
                steps
            });
        } catch (e: any) {
            alert(e.message || 'Erro ao salvar playbook');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]">
            <CardContent className="p-6 flex flex-col gap-6">
                <div>
                    <h3 className="font-semibold text-lg border-b pb-2 text-[hsl(var(--ui-text))] mb-4 border-[hsl(var(--ui-border))]">
                        {playbook ? 'Editor de Playbook' : 'Criar Novo Playbook'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold px-1">Nome do Fluxo</label>
                            <input 
                                className="w-full text-sm rounded bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] p-2 outline-none focus:ring-1"
                                value={name} 
                                onChange={(e: any) => setName(e.target.value)} 
                                placeholder="Dê um nome para o playbook..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold px-1">Entidade Raiz</label>
                            <select 
                                className="w-full text-sm rounded bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] p-2 outline-none focus:ring-1"
                                value={entity}
                                onChange={(e: any) => setEntity(e.target.value)}
                            >
                                {PlaybookEntitySchema.options.map((opt: string) => (
                                    <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1 mt-4">
                        <label className="text-xs font-semibold px-1">Descrição</label>
                        <textarea 
                            className="w-full min-h-[60px] resize-y text-sm rounded bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] p-2 outline-none focus:ring-1"
                            value={description} 
                            onChange={(e: any) => setDescription(e.target.value)}
                            placeholder="Descreva quando utilizar... (opcional)"
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <input 
                            type="checkbox" 
                            id="active"
                            checked={isActive} 
                            onChange={(e: any) => setIsActive(e.target.checked)}
                            className="w-4 h-4 rounded text-[hsl(var(--ui-accent-blue))]"
                        />
                        <label htmlFor="active" className="text-sm cursor-pointer">
                            Playbook Ativo (operadores poderão usá-lo)
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-[hsl(var(--ui-border))]">
                    <PlaybookStepEditor steps={steps} onChange={setSteps} />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-[hsl(var(--ui-border))]">
                    <Button variant="secondary" type="button" onClick={onCancel} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Gravando...' : 'Salvar Sistema Playbook'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
