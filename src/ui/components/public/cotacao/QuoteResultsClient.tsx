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

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 p-5">
            <div className="h-5 w-2/3 bg-zinc-300 rounded mb-3" />
            <div className="h-4 w-1/2 bg-zinc-200 rounded mb-2" />
            <div className="h-4 w-1/3 bg-zinc-200 rounded" />
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
    const highlight = isBestPrice || isBestSpeed;
    return (
        <div
            className={`relative rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-lg ${isBestPrice
                    ? 'border-emerald-500 bg-emerald-50 shadow-emerald-100 shadow-md'
                    : isBestSpeed
                        ? 'border-blue-500 bg-blue-50 shadow-blue-100 shadow-md'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                }`}
        >
            {/* Badges */}
            <div className="flex gap-2 mb-3 flex-wrap">
                {isBestPrice && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-zinc-50 px-2.5 py-0.5 text-xs font-semibold">
                        💰 Melhor Preço
                    </span>
                )}
                {isBestSpeed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 text-zinc-50 px-2.5 py-0.5 text-xs font-semibold">
                        ⚡ Mais Rápido
                    </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
                    Simulado
                </span>
            </div>

            {/* Carrier name */}
            <h3 className={`text-lg font-bold mb-1 ${highlight ? 'text-zinc-900' : 'text-zinc-700'}`}>
                {quote.serviceName}
            </h3>

            {/* Details */}
            <div className="flex items-end justify-between mt-3">
                <div>
                    <p className="text-2xl font-black text-zinc-900">
                        R$ {quote.price.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                        {quote.estimatedDeliveryDays === 1
                            ? '1 dia útil'
                            : `${quote.estimatedDeliveryDays} dias úteis`}
                    </p>
                </div>
                <div className="text-right">
                    {quote.trackingProvided && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                            📦 Rastreável
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function QuoteResultsClient({ intentId }: { intentId: string }) {
    const [data, setData] = useState<QuotesResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQuotes() {
            try {
                const res = await fetch(`/api/public/cotacao/quotes?intentId=${intentId}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.error?.message || `Erro ${res.status}`);
                }
                const json: QuotesResponse = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchQuotes();
    }, [intentId]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-6 w-1/3 bg-zinc-300 rounded animate-pulse mb-2" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-700 font-medium">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-3 text-sm text-red-600 underline hover:text-red-800"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!data || data.quotes.length === 0) {
        return (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center text-zinc-500">
                Nenhuma cotação encontrada para esta simulação.
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-zinc-800">
                    Resultados da Cotação
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                    {data.quotes.length} opções de frete simuladas
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="mt-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-center text-zinc-50">
                <h3 className="text-lg font-bold">Quer cotações reais?</h3>
                <p className="text-sm opacity-90 mt-1 mb-4">
                    Desbloqueie cotações de transportadoras reais, regras de negócio e tabela personalizada.
                </p>
                <button className="rounded-lg bg-zinc-50 text-indigo-700 font-semibold px-6 py-2.5 text-sm hover:bg-zinc-100 transition-colors shadow-lg">
                    Criar Conta Gratuita
                </button>
            </div>
        </div>
    );
}
