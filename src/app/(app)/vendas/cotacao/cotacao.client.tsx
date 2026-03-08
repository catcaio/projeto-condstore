'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart,
    Plus,
    Trash2,
    Truck,
    Loader2,
    ArrowRight,
    Check,
    Package,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ItemRow {
    productRef: string;
    quantity: number;
}

interface QuoteResult {
    carrier: string;
    price: number;
    deadline: number;
    zoneCode: string;
}

interface QuoteResponse {
    simulationId: string;
    state: string;
    volumes: any[];
    totalWeight: number;
    chargedWeight: number;
    quotes: QuoteResult[];
}

type Step = 'form' | 'quotes' | 'creating';

// ─── Component ──────────────────────────────────────────────────────────────

export function CotacaoClient() {
    const router = useRouter();

    const [step, setStep] = useState<Step>('form');
    const [cep, setCep] = useState('');
    const [items, setItems] = useState<ItemRow[]>([{ productRef: '', quantity: 1 }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
    const [creatingCarrier, setCreatingCarrier] = useState<string | null>(null);

    // ─── CEP mask ───────────────────────────────────────────────────────
    const handleCepChange = (val: string) => {
        const clean = val.replace(/\D/g, '').slice(0, 8);
        if (clean.length > 5) {
            setCep(clean.slice(0, 5) + '-' + clean.slice(5));
        } else {
            setCep(clean);
        }
    };

    // ─── Item management ────────────────────────────────────────────────
    const addItem = () => setItems([...items, { productRef: '', quantity: 1 }]);
    const removeItem = (idx: number) => {
        if (items.length > 1) setItems(items.filter((_, i) => i !== idx));
    };
    const updateItem = (idx: number, field: keyof ItemRow, value: string | number) => {
        setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    // ─── Submit quote ───────────────────────────────────────────────────
    const submitQuote = async () => {
        setError('');
        const cepClean = cep.replace(/\D/g, '');
        if (cepClean.length < 8) {
            setError('CEP deve ter 8 dígitos');
            return;
        }
        if (items.some(i => !i.productRef.trim())) {
            setError('Preencha o código de todos os produtos');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/sales/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cepDestino: cepClean, items }),
            });
            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.error || 'Erro ao calcular cotação');
            }
            setQuoteData(json.data);
            setStep('quotes');
        } catch (err: any) {
            setError(err.message || 'Erro inesperado');
        } finally {
            setLoading(false);
        }
    };

    // ─── Select carrier → create shipment ───────────────────────────────
    const selectCarrier = async (quote: QuoteResult) => {
        if (!quoteData) return;
        setCreatingCarrier(quote.carrier);
        setError('');

        try {
            const res = await fetch('/api/freight/create-shipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    simulationId: quoteData.simulationId,
                    carrier: quote.carrier,
                    price: quote.price,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.ok) {
                throw new Error(json.error || 'Erro ao criar envio');
            }
            setStep('creating');
            // Redirect after brief success toast
            setTimeout(() => router.push('/logistica/envios'), 1500);
        } catch (err: any) {
            setError(err.message || 'Erro inesperado');
            setCreatingCarrier(null);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <div className="max-w-[800px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <ShoppingCart className="w-6 h-6 text-[hsl(var(--ui-accent-blue))]" />
                <div>
                    <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight">Nova Cotação</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        {step === 'form' && 'Preencha os dados para simular o frete'}
                        {step === 'quotes' && 'Selecione a transportadora'}
                        {step === 'creating' && 'Envio criado com sucesso'}
                    </p>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-500">
                    {error}
                </div>
            )}

            {/* ── STEP 1: Form ────────────────────────────────────────── */}
            {step === 'form' && (
                <div className="space-y-6">
                    {/* CEP */}
                    <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-2">
                            CEP Destino
                        </label>
                        <input
                            type="text"
                            value={cep}
                            onChange={e => handleCepChange(e.target.value)}
                            placeholder="01310-100"
                            className="w-full max-w-[200px] px-3 py-2 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] text-sm font-mono focus:outline-none focus:border-[hsl(var(--ui-accent-blue))] transition-colors"
                        />
                    </div>

                    {/* Products */}
                    <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                                Produtos
                            </label>
                            <button
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--ui-accent-blue))] hover:opacity-80 transition-opacity"
                            >
                                <Plus className="w-3.5 h-3.5" /> Adicionar
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={item.productRef}
                                        onChange={e => updateItem(idx, 'productRef', e.target.value)}
                                        placeholder="Código do produto"
                                        className="flex-1 px-3 py-2 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] text-sm focus:outline-none focus:border-[hsl(var(--ui-accent-blue))] transition-colors"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-20 px-3 py-2 rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] text-sm text-center focus:outline-none focus:border-[hsl(var(--ui-accent-blue))] transition-colors"
                                    />
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="p-2 rounded-lg text-[hsl(var(--ui-text-muted))] hover:text-red-500 hover:bg-red-500/5 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={submitQuote}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-[hsl(var(--ui-accent-blue))] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</>
                        ) : (
                            <><Truck className="w-4 h-4" /> Calcular Frete</>
                        )}
                    </button>
                </div>
            )}

            {/* ── STEP 2: Carrier Selection ───────────────────────────── */}
            {step === 'quotes' && quoteData && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Volumes</p>
                            <p className="text-lg font-bold text-[hsl(var(--ui-text))]">{quoteData.volumes.length}</p>
                        </div>
                        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Peso Cobrado</p>
                            <p className="text-lg font-bold text-[hsl(var(--ui-text))]">{quoteData.chargedWeight} kg</p>
                        </div>
                        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--ui-text-muted))] mb-1">Estado</p>
                            <p className="text-lg font-bold text-[hsl(var(--ui-text))]">{quoteData.state || '—'}</p>
                        </div>
                    </div>

                    {/* Quotes table */}
                    {quoteData.quotes.length === 0 ? (
                        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-8 text-center">
                            <Package className="w-8 h-8 text-[hsl(var(--ui-text-muted)/0.3)] mx-auto mb-3" />
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">Nenhuma transportadora retornou cotação para este destino.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Transportadora</th>
                                        <th className="px-5 py-3 font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Preço</th>
                                        <th className="px-5 py-3 font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider">Prazo</th>
                                        <th className="px-5 py-3 font-semibold text-[hsl(var(--ui-text-muted))] text-xs uppercase tracking-wider text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[hsl(var(--ui-border))]">
                                    {quoteData.quotes.map((q, i) => (
                                        <tr key={q.carrier} className="hover:bg-[hsl(var(--ui-bg)/0.5)] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                                                    <span className="font-medium text-[hsl(var(--ui-text))] capitalize">{q.carrier}</span>
                                                    {i === 0 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold uppercase">Melhor</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-bold text-[hsl(var(--ui-text))]">
                                                R$ {q.price.toFixed(2)}
                                            </td>
                                            <td className="px-5 py-4 text-[hsl(var(--ui-text-muted))]">
                                                {q.deadline > 0 ? `${q.deadline} dias úteis` : '—'}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => selectCarrier(q)}
                                                    disabled={creatingCarrier !== null}
                                                    className="px-4 py-2 rounded-lg bg-[hsl(var(--ui-accent-blue))] text-white text-xs font-semibold flex items-center gap-1.5 ml-auto hover:opacity-90 disabled:opacity-40 transition-opacity"
                                                >
                                                    {creatingCarrier === q.carrier ? (
                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...</>
                                                    ) : (
                                                        <><ArrowRight className="w-3.5 h-3.5" /> Escolher</>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Back button */}
                    <button
                        onClick={() => { setStep('form'); setQuoteData(null); setError(''); }}
                        className="text-xs font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                    >
                        ← Nova cotação
                    </button>
                </div>
            )}

            {/* ── STEP 3: Success ────────────────────────────────────── */}
            {step === 'creating' && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Check className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[hsl(var(--ui-text))]">Envio criado com sucesso!</p>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-1">Redirecionando para o painel de envios...</p>
                    </div>
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                </div>
            )}
        </div>
    );
}
