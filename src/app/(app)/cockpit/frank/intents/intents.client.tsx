'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/ui/components';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Brain, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { IntentReviewPanel } from './components/intent-review-panel';

export interface CapturedIntent {
    id: string;
    conversationId: string | null;
    messageText: string;
    detectedIntent: string | null;
    confidence: string | null;
    entities: Record<string, any> | null;
    createdAt: string;
}

export function IntentLearningClient() {
    const [intents, setIntents] = useState<CapturedIntent[]>([]);
    const [playbooks, setPlaybooks] = useState<{ id: string; title: string; intent: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resIntents, resPlaybooks] = await Promise.all([
                fetch('/api/cockpit/frank/intents'),
                fetch('/api/cockpit/frank/playbooks')
            ]);
            
            if (resIntents.ok) {
                const { data } = await resIntents.json();
                setIntents(data || []);
            }
            if (resPlaybooks.ok) {
                const { data } = await resPlaybooks.json();
                setPlaybooks(data || []);
            }
        } catch (e) {
            console.error('Failed to load data', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleProcessed = (id: string) => {
        setIntents(prev => prev.filter(i => i.id !== id));
    };

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/cockpit/frank"
                        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-[hsl(var(--ui-accent-blue))] hover:bg-[hsl(var(--ui-bg-subtle))] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--ui-text))] flex items-center gap-2">
                            <Brain className="h-6 w-6 text-purple-600" />
                            Treinamento de Intents
                        </h1>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">Classifique as perguntas recebidas nas conversas reais.</p>
                    </div>
                </div>
                <Button variant="secondary" onClick={loadData} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[hsl(var(--ui-text-muted))]">Carregando intents capturadas...</div>
            ) : intents.length === 0 ? (
                <Card className="border-dashed shadow-none">
                    <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                        <Brain className="mb-4 h-12 w-12 text-[hsl(var(--ui-text-muted))] opacity-50" />
                        <div className="text-lg font-medium text-[hsl(var(--ui-text))]">Nenhuma intenção pendente</div>
                        <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))] max-w-sm">
                            As mensagens recebidas serão analisadas e virão para cá caso seja necessário treinamento.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {intents.map(intent => (
                        <IntentReviewPanel 
                            key={intent.id} 
                            intent={intent} 
                            playbooks={playbooks}
                            onProcessed={() => handleProcessed(intent.id)} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
