'use client';

import { useEffect, useState } from 'react';

interface Quote {
    carrierCode: string;
    serviceCode: string;
    serviceName: string;
    price: number;
    estimatedDeliveryDays: number;
    trackingProvided: boolean;
    priorityScore: number;
}

interface QuotesResponse {
    intentId: string;
    simulated: boolean;
    quotes: Quote[];
    bestPriceId: string;
    bestSpeedId: string;
}

import { Box, Truck, Zap, PackageSearch } from 'lucide-react';

function SkeletonCard() {
    return (
        <div className="animate-pulse flex flex-col items-center text-center rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm">
            <div className="h-12 w-12 bg-zinc-100 rounded-full mb-4" />
            <div className="h-5 w-32 bg-zinc-200 rounded mb-3" />
            <div className="h-6 w-20 bg-zinc-200 rounded mb-2" />
            <div className="h-4 w-24 bg-zinc-100 rounded mt-4" />
        </div>
    );
}

function QuoteCard({
    quote,
    isBestPrice,
    isBestSpeed,
}: {
    quote: Quote;
    isBestPrice: boolean;
    isBestSpeed: boolean;
}) {
    // Select an icon based on carrier name (fake logic for visual flavor)
    const renderIcon = () => {
        const lower = quote.carrierCode.toLowerCase();
        if (lower.includes('correios')) return <PackageSearch className="w-6 h-6 text-blue-500" />;
        if (lower.includes('loggi')) return <Zap className="w-6 h-6 text-indigo-500" />;
        if (lower.includes('azul')) return <Truck className="w-6 h-6 text-sky-500" />;
        return <Box className="w-6 h-6 text-zinc-400" />;
    };

    return (
        <div className="relative flex flex-col items-center text-center rounded-2xl border border-zinc-100 bg-white p-8 transition-all duration-300 hover:border-zinc-200 hover:shadow-md">

            {/* Top Absolute Badges (Optional - floating top right) */}
            <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
                {isBestPrice && (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        Mais Barato
                    </span>
                )}
                {isBestSpeed && (
                    <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        Mais Rápido
                    </span>
                )}
            </div>

            {/* Icon Bubble */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 mb-4">
                {renderIcon()}
            </div>

            {/* Carrier Info */}
            <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                {quote.serviceName.split(' – ')[0] || quote.serviceName}
            </h3>
            <p className="text-sm font-medium text-blue-600 mb-5">
                {quote.serviceName.split(' – ')[1] || 'Standard'}
            </p>

            {/* Price & Days */}
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-zinc-500 mb-1">Custo estimado</p>
                <p className="text-2xl font-black text-zinc-900 tracking-tight">
                    R$ {quote.price.toFixed(2).replace('.', ',')}
                </p>
            </div>

            {/* Footer tags */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center rounded-full bg-zinc-50 border border-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                    {quote.estimatedDeliveryDays === 1 ? '1 dia útil' : `${quote.estimatedDeliveryDays} dias úteis`}
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-50/50 border border-amber-100/50 px-3 py-1 text-xs font-medium text-amber-600">
                    Simulado
                </span>
            </div>
        </div>
    );
}

export default function QuoteResultsClient({ intentId }: { intentId: string }) {
    const [data, setData] = useState<QuotesResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchQuotes() {
            try {
                const res = await fetch(`/api/public/cotacao/quotes?intentId=${intentId}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.error?.message || `Erro ${res.status}`);
                }
                const json: QuotesResponse = await res.json();
                if (isMounted) setData(json);
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchQuotes();
        return () => { isMounted = false };
    }, [intentId]);

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto">
                <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse mb-8 mx-auto" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center max-w-2xl mx-auto mt-12">
                <p className="text-red-600 font-medium mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center rounded-lg bg-white border border-red-200 text-red-700 font-semibold px-6 py-2.5 text-sm hover:bg-red-50 transition-colors shadow-sm"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!data || data.quotes.length === 0) {
        return (
            <div className="rounded-2xl border border-zinc-100 bg-white p-12 text-center text-zinc-500 max-w-2xl mx-auto mt-12 shadow-sm">
                <Box className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p>Nenhuma cotação encontrada para esta simulação.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
                    Cotações Encontradas
                </h2>
                <p className="text-base text-zinc-500 mt-2">
                    {data.quotes.length} opções de frete simuladas
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {data.quotes.map((q) => (
                    <QuoteCard
                        key={q.carrierCode}
                        quote={q}
                        isBestPrice={q.carrierCode === data.bestPriceId}
                        isBestSpeed={q.carrierCode === data.bestSpeedId}
                    />
                ))}
            </div>

            {/* CTA */}
            <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-8 md:p-12 text-center md:text-left shadow-xl shadow-blue-600/20 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 rounded-full bg-blue-500/50 blur-3xl mix-blend-screen" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 rounded-full bg-blue-700/50 blur-3xl mix-blend-multiply" />

                <div className="relative z-10 max-w-xl">
                    <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Desbloqueie a plataforma completa</h3>
                    <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                        Cotações com tabelas reais, mais de 30 operadoras logísticas, rastreamento ativo de ponta a ponta via WhatsApp e regras de negócio sob medida.
                    </p>
                </div>
                <div className="relative z-10 shrink-0">
                    <button className="rounded-xl bg-white text-blue-600 font-bold px-8 py-3.5 hover:bg-zinc-50 hover:scale-105 transition-all shadow-lg active:scale-95">
                        Criar Conta Gratuita
                    </button>
                </div>
            </div>
        </div>
    );
}
