'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Truck, Zap, PackageSearch, HelpCircle, X, MapPin, Weight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '@/ui/lib/track';

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
    bestScoreId: string;
    summary?: {
        originCep: string;
        destinationCep: string;
        weightInKg: number;
    };
}

function SkeletonCard() {
    return (
        <div className="animate-pulse flex flex-col items-center text-center rounded-2xl border border-zinc-100 bg-zinc-50 p-8 shadow-sm">
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
    isBestScore,
    onClick,
}: {
    quote: Quote;
    isBestPrice: boolean;
    isBestSpeed: boolean;
    isBestScore: boolean;
    onClick: () => void;
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
        <motion.div
            onClick={onClick}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`cursor-pointer relative flex flex-col items-center text-center rounded-2xl border bg-zinc-50 p-8 transition-shadow duration-300 hover:shadow-xl ${isBestScore ? 'border-amber-400/50 shadow-amber-100' : 'border-zinc-100 hover:border-zinc-200'}`}
        >

            {/* Top Absolute Badges */}
            <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
                {isBestScore && (
                    <span title="Calculado usando 60% preço, 40% prazo" className="cursor-help inline-flex flex-row items-center gap-1 rounded bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-bold text-zinc-50 uppercase tracking-wider shadow-sm">
                        ⭐ Melhor Custo-Benefício
                    </span>
                )}
                {isBestPrice && !isBestScore && (
                    <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        Mais Barato
                    </span>
                )}
                {isBestSpeed && !isBestScore && (
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

            {/* Footer tags & Score */}
            <div className="mt-4 w-full flex flex-col items-center">
                {/* Visual Score Bar */}
                <div className="w-full flex items-center justify-between mt-2 mb-4 group relative">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Score</span>
                    <div className="flex-1 mx-3 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${isBestScore ? 'bg-amber-400' : 'bg-blue-500/50'}`}
                            style={{ width: `${quote.priorityScore}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">{quote.priorityScore}/100</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 bg-zinc-800 text-zinc-50 text-[10px] rounded p-2 text-center pointer-events-none z-10">
                        Heurística de Machine Learning que combina impacto de 60% do preço e 40% do prazo.
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-zinc-50 border border-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                        {quote.estimatedDeliveryDays === 1 ? '1 dia útil' : `${quote.estimatedDeliveryDays} dias úteis`}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-amber-50/50 border border-amber-100/50 px-3 py-1 text-xs font-medium text-amber-600">
                        Simulado
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function PremiumModal({ isOpen, onClose, intentId }: { isOpen: boolean; onClose: () => void; intentId: string }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="relative z-10 w-full max-w-lg bg-zinc-50 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="p-8 pb-6">
                            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Desbloqueie a plataforma</h2>
                            <p className="text-zinc-500 mt-2 text-sm">
                                O plano Premium oferece controle total sobre as suas operações logísticas e acesso a transportadoras reais.
                            </p>

                            <ul className="mt-6 space-y-4">
                                {[
                                    'Tabela própria por transportadora (upload/ajuste)',
                                    'Ranking customizado por regra do cliente',
                                    'Restrição de CNPJ e gerenciamento de perfis',
                                    'Histórico persistente de simulações',
                                    'Integrações com Correios, Loggi e Azul reais',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-700 font-medium">
                                        <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    trackEvent({ type: 'cotacao_upgrade_cta_clicked', page: '/cotacao', section: 'modal', metadata: { intentId } });
                                    onClose();
                                }}
                                className="flex-1 bg-blue-600 text-zinc-50 font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Quero isso
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-zinc-50 border border-zinc-200 text-zinc-600 font-semibold py-3 rounded-xl hover:bg-zinc-100 transition-colors"
                            >
                                Agora não
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default function QuoteResultsClient({ intentId }: { intentId: string }) {
    const [data, setData] = useState<QuotesResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const hasTrackedView = useRef(false);

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
                if (isMounted) {
                    setData(json);

                    if (!hasTrackedView.current) {
                        trackEvent({
                            type: 'cotacao_result_viewed',
                            page: '/cotacao',
                            section: 'results',
                            metadata: {
                                intentId,
                                quotesCount: json.quotes?.length,
                                bestScoreId: json.bestScoreId
                            }
                        });
                        hasTrackedView.current = true;
                    }

                    try {
                        localStorage.setItem('condstore_lastQuoteIntentId', intentId);
                        localStorage.setItem('condstore_lastQuoteTimestamp', Date.now().toString());
                        if (json.summary) {
                            localStorage.setItem('condstore_lastQuoteSummary', JSON.stringify(json.summary));
                        }
                    } catch (e) {
                        // ignore localStorage errors (e.g. private mode)
                    }
                }
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
                    className="inline-flex items-center justify-center rounded-lg bg-zinc-50 border border-red-200 text-red-700 font-semibold px-6 py-2.5 text-sm hover:bg-red-50 transition-colors shadow-sm"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!data || data.quotes.length === 0) {
        return (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-12 text-center text-zinc-500 max-w-2xl mx-auto mt-12 shadow-sm">
                <Box className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p>Nenhuma cotação encontrada para esta simulação.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto pb-12 px-4">
            <PremiumModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} intentId={intentId} />

            {/* Header / Summary */}
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
                    Cotações Encontradas
                </h2>
                <p className="text-base text-zinc-500 mt-2">
                    {data.quotes.length} opções de frete simuladas para sua carga
                </p>

                {data.summary && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm bg-zinc-50 border border-zinc-100 shadow-sm rounded-full py-2 px-6 max-w-fit mx-auto"
                    >
                        <div className="flex items-center gap-2 text-zinc-600 font-medium">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            {data.summary.originCep} <ArrowRight className="w-3 h-3 text-zinc-300 mx-1" /> {data.summary.destinationCep}
                        </div>
                        <div className="w-px h-4 bg-zinc-200" />
                        <div className="flex items-center gap-2 text-zinc-600 font-medium">
                            <Weight className="w-4 h-4 text-zinc-400" />
                            {data.summary.weightInKg} kg
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Cards Grid */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
            >
                {data.quotes.map((q) => (
                    <motion.div key={q.carrierCode} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                        <QuoteCard
                            quote={q}
                            isBestPrice={q.carrierCode === data.bestPriceId}
                            isBestSpeed={q.carrierCode === data.bestSpeedId}
                            isBestScore={q.carrierCode === data.bestScoreId}
                            onClick={() => {
                                trackEvent({
                                    type: 'cotacao_card_clicked',
                                    page: '/cotacao',
                                    section: 'results',
                                    metadata: {
                                        intentId,
                                        carrierCode: q.carrierCode,
                                        price: q.price,
                                        score: q.priorityScore
                                    }
                                });
                                // in a real app, this would select it or open details
                                setIsModalOpen(true);
                            }}
                        />
                    </motion.div>
                ))}
            </motion.div>

            {/* CTA */}
            <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-8 md:p-12 text-center md:text-left shadow-xl shadow-blue-600/20 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 rounded-full bg-blue-500/50 blur-3xl mix-blend-screen" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 rounded-full bg-blue-700/50 blur-3xl mix-blend-multiply" />

                <div className="relative z-10 max-w-xl">
                    <h3 className="text-2xl font-bold text-zinc-50 tracking-tight mb-2">Desbloqueie a plataforma completa</h3>
                    <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                        Cotações com tabelas reais, mais de 30 operadoras logísticas, rastreamento ativo de ponta a ponta via WhatsApp e regras de negócio sob medida.
                    </p>
                </div>
                <div className="relative z-10 shrink-0">
                    <button
                        onClick={() => {
                            trackEvent({ type: 'cotacao_upgrade_cta_clicked', page: '/cotacao', section: 'footer_cta', metadata: { intentId } });
                            setIsModalOpen(true);
                        }}
                        className="rounded-xl bg-zinc-50 text-blue-600 font-bold px-8 py-3.5 hover:bg-zinc-100 hover:scale-105 transition-all shadow-lg active:scale-95"
                    >
                        Criar Conta Gratuita
                    </button>
                </div>
            </div>
        </div>
    );
}
