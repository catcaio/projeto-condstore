'use client';

import React, { useState, useEffect } from 'react';
import { PlaybookDefinition, PlaybookEntity } from '@/modules/playbooks/playbooks.types';
import { Button } from '@/ui/components/button';
import { PlayCircle, ChevronDown } from 'lucide-react';

interface PlaybookQuickActionsProps {
    entity: PlaybookEntity;
    entityId: string;
}

export function PlaybookQuickActions({ entity, entityId }: PlaybookQuickActionsProps) {
    const [playbooks, setPlaybooks] = useState<PlaybookDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchPlaybooks = async () => {
            try {
                const res = await fetch(`/api/cockpit/playbooks?entity=${entity}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.ok) {
                        setPlaybooks(data.data.filter((p: any) => p.isActive));
                    }
                }
            } catch (err) {
                console.error('Falha ao carregar playbooks contextuais', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaybooks();
    }, [entity, entityId]);

    const handleExecute = async (playbook: PlaybookDefinition) => {
        setExecuting(true);
        setIsOpen(false);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            alert(`Playbook "${playbook.name}" concluído com sucesso`);
        } finally {
            setExecuting(false);
        }
    };

    if (loading || playbooks.length === 0) return null;

    return (
        <div className="relative">
            <Button 
                variant="secondary" 
                size="sm" 
                className="w-full justify-between items-center text-xs h-9"
                onClick={() => setIsOpen(!isOpen)}
                disabled={executing}
            >
                <div className="flex items-center gap-2">
                    <PlayCircle className="w-3.5 h-3.5 text-[hsl(var(--ui-accent-blue))]" />
                    Playbooks Operacionais
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] rounded-md shadow-lg z-50 py-1 overflow-hidden" 
                     onMouseLeave={() => setIsOpen(false)}>
                    {playbooks.map(pb => (
                        <button 
                            key={pb.id}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[hsl(var(--ui-bg-subtle))] transition-colors flex flex-col gap-0.5"
                            onClick={() => handleExecute(pb)}
                        >
                            <span className="font-semibold text-[hsl(var(--ui-text))]">{pb.name}</span>
                            {pb.description && (
                                <span className="text-[10px] text-[hsl(var(--ui-text-muted))] line-clamp-1">
                                    {pb.description}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
