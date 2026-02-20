
'use client';

import { useEffect, useState } from 'react';
import { Target, AlertTriangle, ArrowRight, MessageSquare, Box, DollarSign } from 'lucide-react';

// Define types for the API response
interface FunnelStats {
    counts: Record<string, number>;
    conversionRate: string;
    abandoned: number;
}

interface MetricsResponse {
    mensagensHoje: number;
    cotacoesHoje: number;
    funnel: FunnelStats;
    // ... other fields
}

export default function MetricsPage() {
    const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const res = await fetch('/api/cockpit/metrics');
                if (res.ok) {
                    const data = await res.json();
                    setMetrics(data);
                }
            } catch (error) {
                console.error('Failed to fetch metrics', error);
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
    }, []);

    if (loading) {
        return <div className="p-6 text-zinc-400">Carregando métricas...</div>;
    }

    if (!metrics) {
        return <div className="p-6 text-red-400">Erro ao carregar métricas.</div>;
    }

    const { funnel } = metrics;
    const intentDetected = funnel?.counts['INTENT_DETECTED'] || 0;
    const cepReceived = funnel?.counts['CEP_RECEIVED'] || 0;
    const quoteSent = funnel?.counts['QUOTE_SENT'] || 0;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto text-zinc-100">
            <header>
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                    Métricas de Conversão (Frete)
                </h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Conversion Rate */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-500 text-sm font-medium uppercase">Conversão Total</p>
                            <h3 className="text-3xl font-bold text-emerald-400 mt-2">{funnel?.conversionRate}%</h3>
                        </div>
                        <Target className="text-emerald-500 w-5 h-5" />
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">De intenção para cotação enviada</p>
                </div>

                {/* 2. Abandonment */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-500 text-sm font-medium uppercase">Abandonos</p>
                            <h3 className="text-3xl font-bold text-red-400 mt-2">{funnel?.abandoned}</h3>
                        </div>
                        <AlertTriangle className="text-red-500 w-5 h-5" />
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">Sessões expiradas sem conclusão</p>
                </div>

                {/* 3. Total Quotes */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-500 text-sm font-medium uppercase">Cotações Hoje</p>
                            <h3 className="text-3xl font-bold text-blue-400 mt-2">{metrics.cotacoesHoje}</h3>
                        </div>
                        <DollarSign className="text-blue-500 w-5 h-5" />
                    </div>
                </div>

                {/* 4. Total Messages */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-500 text-sm font-medium uppercase">Mensagens Hoje</p>
                            <h3 className="text-3xl font-bold text-zinc-100 mt-2">{metrics.mensagensHoje}</h3>
                        </div>
                        <MessageSquare className="text-zinc-500 w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Funnel Visualisation */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                <h3 className="text-lg font-medium mb-6">Funil de Vendas (Cotação de Frete)</h3>

                <div className="space-y-6">
                    {/* Stage 1: Intent Detected */}
                    <div className="relative">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-blue-400">Intenção Detectada</span>
                            <span className="text-sm text-zinc-400">{intentDetected}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center -my-2 opacity-30">
                        <ArrowRight className="w-4 h-4 text-zinc-500 rotate-90" />
                    </div>

                    {/* Stage 2: CEP Received */}
                    <div className="relative">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-yellow-400">CEP Recebido</span>
                            <span className="text-sm text-zinc-400">{cepReceived}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-yellow-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${intentDetected > 0 ? (cepReceived / intentDetected) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-xs text-zinc-600 mt-1">
                            {intentDetected > 0 ? ((cepReceived / intentDetected) * 100).toFixed(1) : 0}% conversão
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center -my-2 opacity-30">
                        <ArrowRight className="w-4 h-4 text-zinc-500 rotate-90" />
                    </div>

                    {/* Stage 3: Quote Sent */}
                    <div className="relative">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-emerald-400">Cotação Enviada</span>
                            <span className="text-sm text-zinc-400">{quoteSent}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${intentDetected > 0 ? (quoteSent / intentDetected) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-xs text-zinc-600 mt-1">
                            {intentDetected > 0 ? ((quoteSent / intentDetected) * 100).toFixed(1) : 0}% conversão total
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
