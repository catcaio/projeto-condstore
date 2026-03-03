'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';

export default function PublicCotacaoPage() {
    const [formData, setFormData] = useState({
        originCep: '',
        destinationCep: '',
        weightInKg: '',
        packageType: 'box',
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ intentId?: string; error?: string } | null>(null);
    const [lastIntent, setLastIntent] = useState<{ id: string; timeAgo: string } | null>(null);

    useEffect(() => {
        try {
            const id = localStorage.getItem('condstore_lastQuoteIntentId');
            const tsStr = localStorage.getItem('condstore_lastQuoteTimestamp');
            if (id && tsStr) {
                const ts = parseInt(tsStr, 10);
                const diffMs = Date.now() - ts;
                const hrs = Math.floor(diffMs / (1000 * 60 * 60));

                if (hrs < 48) { // Only show if less than 48 hours old
                    let timeText = 'recentemente';
                    if (hrs >= 1) timeText = `há ${hrs} hora${hrs > 1 ? 's' : ''}`;
                    else {
                        const mins = Math.floor(diffMs / (1000 * 60));
                        if (mins > 0) timeText = `há ${mins} min`;
                    }
                    setLastIntent({ id, timeAgo: timeText });
                }
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const payload = {
                ...formData,
                weightInKg: parseFloat(formData.weightInKg),
                clientTs: Date.now(),
                landingPath: window.location.pathname,
            };

            const res = await fetch('/api/public/cotacao/intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message || 'Erro ao simular cotação');
            }

            // Redirect to result page
            window.location.href = `/cotacao/result?intentId=${data.intentId}`;
            return;
        } catch (err: any) {
            setResult({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-200 flex flex-col items-center justify-center p-4 text-zinc-800">
            {lastIntent && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full mb-6 cursor-pointer group"
                    onClick={() => { window.location.href = `/cotacao/result?intentId=${lastIntent.id}` }}
                >
                    <div className="bg-indigo-600 text-zinc-50 rounded-xl shadow-lg p-5 flex items-center justify-between border border-indigo-500 overflow-hidden relative">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-zinc-50 opacity-5 rounded-full" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-10 h-10 bg-zinc-50/10 rounded-full flex items-center justify-center shrink-0 border border-zinc-50/20">
                                <Clock className="w-5 h-5 text-indigo-100" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">Continuar simulação</h3>
                                <p className="text-sm text-indigo-200 mt-0.5">Criada {lastIntent.timeAgo}</p>
                            </div>
                        </div>
                        <div className="relative z-10 w-8 h-8 rounded-full bg-zinc-50/10 flex items-center justify-center group-hover:bg-zinc-50/25 transition-colors">
                            <ArrowRight className="w-4 h-4 text-zinc-50" />
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="max-w-md w-full bg-zinc-50 rounded-xl shadow-md p-6 relative z-10">
                <h1 className="text-2xl font-bold mb-4 text-center">Simule seu Frete</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700">CEP Origem</label>
                        <input
                            type="text"
                            required
                            maxLength={8}
                            className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-zinc-50"
                            value={formData.originCep}
                            onChange={(e) => setFormData({ ...formData, originCep: e.target.value.replace(/\D/g, '') })}
                            placeholder="00000000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700">CEP Destino</label>
                        <input
                            type="text"
                            required
                            maxLength={8}
                            className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-zinc-50"
                            value={formData.destinationCep}
                            onChange={(e) => setFormData({ ...formData, destinationCep: e.target.value.replace(/\D/g, '') })}
                            placeholder="00000000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700">Peso (kg)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            min="0.1"
                            className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-zinc-50"
                            value={formData.weightInKg}
                            onChange={(e) => setFormData({ ...formData, weightInKg: e.target.value })}
                            placeholder="1.0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700">Tipo de Embalagem</label>
                        <select
                            className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-zinc-50"
                            value={formData.packageType}
                            onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                        >
                            <option value="box">Caixa</option>
                            <option value="envelope">Envelope</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Simulando...' : 'Cotar Frete'}
                    </button>
                </form>

                {result?.error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                        {result.error}
                    </div>
                )}

                {result?.intentId && (
                    <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
                        <p><strong>Cotação Registrada!</strong></p>
                        <p className="text-xs break-all mt-1 opacity-70">Intent ID: {result.intentId}</p>
                        <p className="text-sm mt-2 text-zinc-600">Provedores conectando em breve...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
