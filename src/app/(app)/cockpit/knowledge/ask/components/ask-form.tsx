'use client';

import { useState } from 'react';
import { Bot, Send, Search, ExternalLink, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Badge } from '@/ui/components';
import Link from 'next/link';

export function AskForm() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ answer: string; confidence: number; citations: any[] } | null>(null);
    const [error, setError] = useState('');
    const [includeSensitive, setIncludeSensitive] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/knowledge/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, includeSensitive })
            });

            if (!res.ok) {
                throw new Error(await res.text() || 'Falha na pesquisa');
            }

            const data = await res.json();
            setResult({
                answer: data.answer,
                confidence: data.confidence,
                citations: data.citations
            });
        } catch (err: any) {
            setError(err.message || 'Erro de rede');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[hsl(var(--ui-accent-blue)/0.1)] p-2 rounded-md">
                        <Bot className="w-5 h-5 text-[hsl(var(--ui-accent-blue))]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[hsl(var(--ui-text))]">Agente Conhecimento</h2>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">Consulte sua base indexada com precisão</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder="Ex: Como lidar com pacotes extraviados seguindo nossa política?"
                        className="w-full min-h-[100px] border border-[hsl(var(--ui-border))] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue)/0.5)] resize-y whitespace-pre-wrap text-sm"
                    />

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-[hsl(var(--ui-text-muted))]">
                            <input
                                type="checkbox"
                                checked={includeSensitive}
                                onChange={e => setIncludeSensitive(e.target.checked)}
                                className="rounded text-[hsl(var(--ui-accent-blue))] focus:ring-[hsl(var(--ui-accent-blue))]"
                            />
                            Incluir documentos sensíveis (Pode acionar restrição de plano)
                        </label>

                        <button
                            type="submit"
                            disabled={loading || !question.trim()}
                            className="bg-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-accent-blue)/0.9)] text-white px-5 py-2 rounded-md flex items-center gap-2 disabled:opacity-50 transition-colors font-medium text-sm"
                        >
                            {loading ? <Search className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Consultar Índice
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="mt-4 bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger-ink))] p-3 rounded-md text-sm border border-[hsl(var(--ui-danger)/0.2)]">
                        {error}
                    </div>
                )}
            </div>

            {/* Skeleton Loading Override */}
            {loading && (
                <div className="animate-pulse bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-6 rounded-lg min-h-[200px]">
                    <div className="h-4 bg-[hsl(var(--ui-page))] rounded w-1/4 mb-4"></div>
                    <div className="h-3 bg-[hsl(var(--ui-page))] rounded w-full mb-2"></div>
                    <div className="h-3 bg-[hsl(var(--ui-page))] rounded w-5/6 mb-4"></div>
                </div>
            )}

            {result && !loading && (
                <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-6 rounded-lg">
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-[hsl(var(--ui-border))]">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            Resposta
                            {result.confidence < 0.78 && <Badge variant="danger"><AlertTriangle className="w-3 h-3 mr-1" /> Confiança Baixa ({result.confidence.toFixed(2)})</Badge>}
                            {result.confidence >= 0.78 && <Badge variant="success">Confiança Alta ({result.confidence.toFixed(2)})</Badge>}
                        </h3>
                    </div>

                    <div className="prose prose-sm xl:prose-base max-w-none mb-8 text-[hsl(var(--ui-text))] whitespace-pre-wrap">
                        {result.answer}
                    </div>

                    <div className="mt-8">
                        <h4 className="text-sm font-semibold text-[hsl(var(--ui-text-muted))] uppercase tracking-wider mb-4">Fontes Utilizadas</h4>

                        {result.citations?.length === 0 ? (
                            <p className="text-sm italic text-[hsl(var(--ui-text-muted))]">Nenhuma citação extraída.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {result.citations?.map((cit, i) => (
                                    <Link
                                        href={`/cockpit/knowledge/documents/${cit.docId}/versions/${cit.versionId}/chunks/${cit.chunkId}`}
                                        key={cit.chunkId}
                                        className="flex items-center justify-between p-3 border border-[hsl(var(--ui-border))] rounded bg-[hsl(var(--ui-page))] hover:bg-[hsl(var(--ui-surface))] hover:border-[hsl(var(--ui-accent-blue)/0.5)] transition-colors group"
                                        target="_blank"
                                    >
                                        <div className="flex flex-col truncate pr-4">
                                            <span className="text-sm font-medium text-[hsl(var(--ui-text))] truncate">
                                                [{i + 1}] {cit.title}
                                            </span>
                                            <span className="text-xs text-[hsl(var(--ui-text-muted))]">
                                                ID: {cit.chunkId.split('-')[0]}
                                                {cit.isSensitive && <span className="ml-2 text-[hsl(var(--ui-warning-ink))]"><ShieldAlert className="inline w-3 h-3 mb-0.5" /> Sensível</span>}
                                            </span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-[hsl(var(--ui-text-muted))] group-hover:text-[hsl(var(--ui-accent-blue))]" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
