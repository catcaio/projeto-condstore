'use client';

import { useState } from 'react';
import { runDomineProcessorAction } from './actions';
import { Badge, Button } from '@/ui/components';
import { Play, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface Props {
    lastRunAt: string | null;
    processedLastWindowCount: number;
    failedCount: number;
    dlqCount: number;
    backlogQueued: number;
}

export function DomineProcessorCard({ lastRunAt, processedLastWindowCount, failedCount, dlqCount, backlogQueued }: Props) {
    const [running, setRunning] = useState(false);

    async function handleRun() {
        setRunning(true);
        try {
            const data: any = await runDomineProcessorAction();
            if (data.ok) {
                alert(`Processado: ${data.processed}. Falhas: ${data.failed}. Recarregue a página para atualizar os números.`);
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Falha ao executar: ${err.message}`);
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <ActivityIcon />
                    <h3 className="font-semibold text-[hsl(var(--ui-text))]">Domine Processor (Idempotent)</h3>
                </div>
                <div className="flex gap-2">
                    {backlogQueued > 0 && <Badge variant="muted">{backlogQueued} Queued</Badge>}
                    {dlqCount > 0 && <Badge variant="danger">{dlqCount} In DLQ</Badge>}
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-2"
                    >
                        <Play className="w-3 h-3" /> {running ? 'Executando...' : 'Rodar Agora'}
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                <div className="flex flex-col gap-1 p-3 bg-[hsl(var(--ui-bg))] rounded border border-[hsl(var(--ui-border))]">
                    <span className="text-[hsl(var(--ui-text-muted))] text-xs font-semibold uppercase">Última Execução</span>
                    <span className="text-[hsl(var(--ui-text))] font-medium">{lastRunAt ? new Date(lastRunAt).toLocaleTimeString('pt-BR') : 'Nunca'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-[hsl(var(--ui-bg))] rounded border border-[hsl(var(--ui-border))]">
                    <span className="text-[hsl(var(--ui-text-muted))] text-xs font-semibold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[hsl(var(--ui-accent-blue))]" /> Sucesso (24h)</span>
                    <span className="text-[hsl(var(--ui-text))] font-medium">{processedLastWindowCount}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-[hsl(var(--ui-bg))] rounded border border-[hsl(var(--ui-border))]">
                    <span className="text-[hsl(var(--ui-text-muted))] text-xs font-semibold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500" /> Tentativas/Falhas</span>
                    <span className="text-[hsl(var(--ui-text))] font-medium">{failedCount}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-[hsl(var(--ui-bg))] rounded border border-[hsl(var(--ui-border))]">
                    <span className="text-[hsl(var(--ui-text-muted))] text-xs font-semibold uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> Fila Morta (DLQ)</span>
                    <span className="text-[hsl(var(--ui-text))] font-medium">{dlqCount}</span>
                </div>
            </div>
        </div>
    );
}

function ActivityIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[hsl(var(--ui-accent-blue))]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    )
}
