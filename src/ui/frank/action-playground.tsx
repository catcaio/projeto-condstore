'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/ui/components';
import { CheckCircle2, XCircle, AlertTriangle, Info, Play, RefreshCw, Layers } from 'lucide-react';

export interface ActionPlaygroundProps {
    actionId: string;
    type: string;
    status: string;
    payload: any;
    explanation: {
        what: string;
        why: string;
        impact: string;
        risk: 'low' | 'medium' | 'high';
        rollback: boolean;
    };
    onApprove: (actionId: string, updatedPayload: any) => Promise<{ success: boolean; error?: string; code?: string } | void>;
    onReject: (actionId: string) => Promise<{ success: boolean; error?: string; code?: string } | void>;
}

export function ActionPlayground({ actionId, type, status, payload, explanation, onApprove, onReject }: ActionPlaygroundProps) {
    const [isPending, startTransition] = useTransition();
    const [editedPayload, setEditedPayload] = useState(() => JSON.stringify(payload, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleApprove = () => {
        try {
            const parsed = JSON.parse(editedPayload);
            setError(null);
            startTransition(async () => {
                const res = await onApprove(actionId, parsed);
                if (res && !res.success) {
                    setError(`Falha [${res.code || 'ERRO'}]: ${res.error}`);
                }
            });
        } catch (e: any) {
            setError('Payload JSON inválido: ' + e.message);
        }
    };

    const handleReject = () => {
        startTransition(async () => {
            const res = await onReject(actionId);
            if (res && !res.success) {
                setError(`Falha ao rejeitar [${res.code || 'ERRO'}]: ${res.error}`);
            }
        });
    };

    const isReadOnly = status !== 'draft' && status !== 'review_required';

    return (
        <div className="flex flex-col gap-6 p-6 border rounded-2xl bg-white dark:bg-[#0A0A0A] shadow-sm max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                        <Play className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[hsl(var(--ui-text))] flex items-center gap-2">
                            Revisão de Ação: <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">{type}</span>
                        </h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                            Proposto por Frank Assistente
                        </p>
                    </div>
                </div>
                
                {/* Status Badge */}
                <div className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                    status === 'approved' || status === 'executed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 flex items-center gap-1' :
                    status === 'failed' || status === 'cancelled' || status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30' :
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30'
                }`}>
                    {status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {status === 'executed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {status.toUpperCase()}
                </div>
            </div>

            {/* Explainability Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <h4 className="flex items-center gap-2 text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-100">
                        <Info className="h-4 w-4 text-blue-500" />
                        O que será feito?
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{explanation.what}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <h4 className="flex items-center gap-2 text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-100">
                        <RefreshCw className="h-4 w-4 text-indigo-500" />
                        Por quê?
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{explanation.why}</p>
                </div>
                <div className="col-span-1 md:col-span-2 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="flex items-center gap-2 text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-100">
                        <Layers className="h-4 w-4 text-amber-500" />
                        Impacto Esperado
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{explanation.impact}</p>
                </div>
            </div>

            {/* Risk & Rollback */}
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A]">
                    <span className="text-zinc-500">Risco:</span>
                    <span className={`font-medium ${
                        explanation.risk === 'low' ? 'text-emerald-600' :
                        explanation.risk === 'medium' ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                        {explanation.risk.toUpperCase()}
                        {explanation.risk === 'high' && <AlertTriangle className="h-4 w-4 inline ml-1" />}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A]">
                    <span className="text-zinc-500">Reversível (Rollback):</span>
                    <span className={`font-medium ${explanation.rollback ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {explanation.rollback ? 'Sim' : 'Não'}
                    </span>
                </div>
            </div>

            {/* Payload Editor */}
            <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Payload da Ação (JSON)</h4>
                <textarea 
                    value={editedPayload}
                    onChange={(e) => setEditedPayload(e.target.value)}
                    disabled={isReadOnly || isPending}
                    className="w-full h-32 p-3 font-mono text-xs rounded-xl border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                    spellCheck={false}
                />
                {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
                {!isReadOnly && <p className="text-xs text-zinc-500">Você pode ajustar os valores do payload antes de aprovar.</p>}
            </div>

            {/* Actions */}
            {!isReadOnly && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button 
                        variant="ghost" 
                        onClick={handleReject}
                        disabled={isPending}
                        className="text-zinc-600 hover:text-rose-600 hover:bg-rose-50"
                    >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar Sugestão
                    </Button>
                    <Button 
                        onClick={handleApprove}
                        disabled={isPending || !!error}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Aprovar e Executar
                    </Button>
                </div>
            )}
        </div>
    );
}
