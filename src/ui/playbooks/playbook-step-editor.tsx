'use client';

import React from 'react';
import { PlaybookStep, PlaybookActionTypeSchema } from '@/modules/playbooks/playbooks.types';
import { Button } from '@/ui/components/button';
import { Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface PlaybookStepEditorProps {
    steps: PlaybookStep[];
    onChange: (steps: PlaybookStep[]) => void;
}

export function PlaybookStepEditor({ steps, onChange }: PlaybookStepEditorProps) {
    
    const handleAddStep = () => {
        const newStep: PlaybookStep = {
            stepId: crypto.randomUUID(),
            title: `Passo ${steps.length + 1}`,
            description: '',
            actionType: 'send_message',
            order: steps.length
        };
        onChange([...steps, newStep]);
    };

    const handleUpdateStep = (idx: number, updates: Partial<PlaybookStep>) => {
        const newSteps = [...steps];
        newSteps[idx] = { ...newSteps[idx], ...updates };
        onChange(newSteps);
    };

    const handleRemoveStep = (idx: number) => {
        const newSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
        onChange(newSteps);
    };

    const handleMoveUp = (idx: number) => {
        if (idx === 0) return;
        const newSteps = [...steps];
        [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
        newSteps.forEach((s, i) => s.order = i);
        onChange(newSteps);
    };

    const handleMoveDown = (idx: number) => {
        if (idx === steps.length - 1) return;
        const newSteps = [...steps];
        [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]];
        newSteps.forEach((s, i) => s.order = i);
        onChange(newSteps);
    };

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-sm mb-2 text-[hsl(var(--ui-text))]">Fluxo Operacional</h4>
            
            {steps.length === 0 && (
                <div className="text-xs text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-bg-subtle))] p-4 rounded border border-[hsl(var(--ui-border))]">
                    Nenhum passo adicionado a este Playbook.
                </div>
            )}

            {steps.map((step, idx) => (
                <div key={step.stepId} className="border border-[hsl(var(--ui-border))] rounded-lg p-3 bg-[hsl(var(--ui-bg))] relative flex gap-3 group">
                    <div className="flex flex-col gap-1 text-[hsl(var(--ui-text-muted))]">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-[10px] font-mono text-center">{idx + 1}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold px-1">Ação</label>
                                <select 
                                    className="w-full text-sm rounded bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] p-2 outline-none focus:ring-1"
                                    value={step.actionType}
                                    onChange={(e: any) => handleUpdateStep(idx, { actionType: e.target.value })}
                                >
                                    {PlaybookActionTypeSchema.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold px-1">Título</label>
                                <input 
                                    className="w-full text-sm rounded bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] p-2 outline-none focus:ring-1"
                                    value={step.title} 
                                    onChange={(e: any) => handleUpdateStep(idx, { title: e.target.value })} 
                                    placeholder="Ex: Enviar Mensagem de Boas-Vindas"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold px-1">Descrição / Instrução (Opcional)</label>
                            <textarea 
                                className="w-full min-h-[60px] resize-y text-sm rounded bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] p-2 outline-none focus:ring-1"
                                value={step.description || ''} 
                                onChange={(e: any) => handleUpdateStep(idx, { description: e.target.value })}
                                placeholder="Apoio operacional ou template de mensagem"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1 border-l pl-2 border-[hsl(var(--ui-border))] justify-between">
                        <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleMoveUp(idx)} disabled={idx === 0}>
                                <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleMoveDown(idx)} disabled={idx === steps.length - 1}>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        <Button size="icon" variant="danger" onClick={() => handleRemoveStep(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            ))}

            <Button type="button" variant="secondary" size="sm" onClick={handleAddStep} className="w-full mt-4 h-9">
                + Adicionar Novo Passo ao Fluxo
            </Button>
        </div>
    );
}
