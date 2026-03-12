'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PipelineActionsProps {
    conversationId: string;
    currentStage: string;
    onStageChanged: () => void;
}

const STAGES = [
    { id: 'NEW', label: 'Novo', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { id: 'QUALIFYING', label: 'Qualificando', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { id: 'QUOTED', label: 'Cotado', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { id: 'NEGOTIATING', label: 'Negociando', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { id: 'WON', label: 'Ganho', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { id: 'LOST', label: 'Perdido', color: 'bg-red-100 text-red-700 hover:bg-red-200' }
];

export default function PipelineActions({ conversationId, currentStage, onStageChanged }: PipelineActionsProps) {
    const [loadingStage, setLoadingStage] = useState<string | null>(null);

    const handleStageChange = async (newStage: string) => {
        if (newStage === currentStage || loadingStage) return;
        setLoadingStage(newStage);

        try {
            const res = await fetch(`/api/cockpit/conversations/${conversationId}/stage`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            });
            if (res.ok) {
                onStageChanged();
            } else {
                alert('Erro ao alterar o estágio.');
            }
        } catch (err) {
            alert('Falha na requisição.');
        } finally {
            setLoadingStage(null);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 text-xs">
            {STAGES.map(stage => {
                const isActive = stage.id === (currentStage || 'NEW');
                const isUpdating = loadingStage === stage.id;
                
                return (
                    <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        disabled={!!loadingStage}
                        className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors font-medium border ${
                            isActive 
                                ? `border-${stage.color.split(' ')[1].split('-')[1]}-400 ring-1 ring-${stage.color.split(' ')[1].split('-')[1]}-300 ${stage.color}`
                                : `border-transparent ${stage.color} opacity-60 hover:opacity-100`
                        } disabled:opacity-50`}
                    >
                        {isUpdating && <Loader2 className="w-3 h-3 animate-spin inline-block" />}
                        {stage.label}
                    </button>
                );
            })}
        </div>
    );
}
