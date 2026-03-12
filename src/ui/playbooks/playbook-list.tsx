'use client';

import React from 'react';
import { Card, CardContent } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { PlaybookDefinition } from '@/modules/playbooks/playbooks.types';
import { Badge } from '@/ui/components/badge';
import { PlayCircle, Settings, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface PlaybookListProps {
    playbooks: PlaybookDefinition[];
    onEdit: (playbook: PlaybookDefinition) => void;
    onDelete: (id: string) => void;
    onExecute?: (playbook: PlaybookDefinition) => void; // Support for manual execution context
}

export function PlaybookList({ playbooks, onEdit, onDelete, onExecute }: PlaybookListProps) {
    if (playbooks.length === 0) {
        return (
            <div className="text-center p-8 border border-dashed rounded-lg border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))]">
                Nenhum playbook encontrado.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {playbooks.map(pb => (
                <Card key={pb.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-semibold text-sm">{pb.name}</h4>
                                <Badge variant={pb.isActive ? 'success' : 'muted'} className="text-[10px]">
                                    {pb.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                                <Badge variant="muted" className="text-[10px] uppercase font-mono tracking-wider">
                                    {pb.entity}
                                </Badge>
                                <span className="text-xs text-[hsl(var(--ui-text-muted))]">
                                    v{pb.version}
                                </span>
                            </div>
                            {pb.description && (
                                <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-2 line-clamp-1">
                                    {pb.description}
                                </p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-[hsl(var(--ui-text-muted))]">
                                <span>{pb.steps.length} {pb.steps.length === 1 ? 'passo' : 'passos'}</span>
                                <span>•</span>
                                <span>Criado em {format(new Date(pb.createdAt), 'dd/MM/yyyy')}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {onExecute && (
                                <Button size="sm" variant="secondary" onClick={() => onExecute(pb)} className="gap-2 h-8 text-xs">
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    Executar
                                </Button>
                            )}
                            <Button size="icon" variant="secondary" onClick={() => onEdit(pb)} title="Editar playbook">
                                <Settings className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="danger" onClick={() => {
                                if(confirm('Tem certeza que deseja excluir este playbook?')) {
                                    onDelete(pb.id);
                                }
                            }} title="Excluir playbook">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
