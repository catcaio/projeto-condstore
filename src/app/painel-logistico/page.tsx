'use client';

import { useState, useEffect } from 'react';
import { Truck, Package, MapPin, Search, AlertCircle, Share2, RefreshCw } from 'lucide-react';
import { FreightOption, FreightRanking, Simulation } from '@/types/freight';
import { calculateRanking, DEFAULT_STRATEGY } from '@/lib/engine/ranking';
import { generateQuoteMessage } from '@/lib/engine/messages';
import { LocalStorageAdapter } from '@/lib/storage/LocalStorageAdapter';
import { FreightCard } from '@/components/FreightCard';
import { SimulationHistory } from '@/components/SimulationHistory';

export default function Dashboard() {
    // Form State
    const [formData, setFormData] = useState({
        destinationCep: '',
        quantity: 1,
        unitWeight: 1,
    });

    // Application State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ranking, setRanking] = useState<FreightRanking | null>(null);
    const [history, setHistory] = useState<Simulation[]>([]);

    // Adapters (Memoized outside or stable instance)
    const storage = new LocalStorageAdapter();

    // Load History on Mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch('/api/history');
                const data = await response.json();
                if (data.success) {
                    setHistory(data.history);
                }
            } catch (err) {
                console.error('Failed to load institutional history', err);
            }
        };
        fetchHistory();
    }, []);

    const handleSimulate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setRanking(null);

        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Erro ao simular frete');
            }

            // Normalize Data (Adapter Pattern at Boundary)
            // Assuming API returns options in a compatible format or needs mapping
            const rawOptions = data.options;

            // Map to FreightOption (Strict Typing)
            const options: FreightOption[] = rawOptions.map((opt: any) => ({
                id: opt.id || crypto.randomUUID(),
                carrier: opt.carrier,
                service: opt.service,
                price: Number(opt.price),
                deliveryDays: Number(opt.deliveryTime),
                source: 'melhor_envio' // Default source for now
            }));

            // 1. Run Decision Engine (Pure Logic)
            const newRanking = calculateRanking(options, DEFAULT_STRATEGY);
            setRanking(newRanking);

            // 2. Persist Simulation (Storage Layer)
            const simulation: Simulation = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                input: {
                    cep: formData.destinationCep,
                    quantity: formData.quantity,
                    weight: formData.unitWeight
                },
                chosenOption: newRanking.bestOption, // Default to best
                ranking: newRanking
            };

            storage.saveSimulation(simulation);

            // Refresh History from API (Real Database)
            const historyResponse = await fetch('/api/history');
            const historyData = await historyResponse.json();
            if (historyData.success) {
                setHistory(historyData.history);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        if (!ranking) return;
        const message = generateQuoteMessage(ranking);

        // Copy to clipboard or open WhatsApp
        navigator.clipboard.writeText(message);

        // Optional: Open WhatsApp Web
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const loadSimulation = (sim: Simulation) => {
        setFormData({
            destinationCep: sim.input.cep,
            quantity: sim.input.quantity,
            unitWeight: sim.input.weight
        });
        setRanking(sim.ranking);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-3">
                    <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-blue-200 shadow-lg">
                        <Truck size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Painel Logístico Inteligente</h1>
                        <p className="text-slate-500 text-sm">Motor de Decisão & Cotação v2.0</p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-12">

                {/* Left Column: Form & History */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <Search size={20} className="text-blue-600" />
                                Nova Simulação
                            </h2>
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 text-[10px] font-bold text-green-600 border border-green-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                DB ONLINE
                            </span>
                        </div>

                        <form onSubmit={handleSimulate} className="space-y-5">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">CEP de Destino</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="00000-000"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        value={formData.destinationCep}
                                        onChange={(e) => setFormData({ ...formData, destinationCep: e.target.value })}
                                        maxLength={9}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Qtd. (Un)</label>
                                    <div className="relative">
                                        <Package className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peso (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        value={formData.unitWeight}
                                        onChange={(e) => setFormData({ ...formData, unitWeight: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-blue-300 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={20} />
                                        Processando Inteligência...
                                    </>
                                ) : (
                                    'Calcular Melhores Opções'
                                )}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-6 rounded-lg bg-red-50 p-4 border border-red-100 flex items-start gap-3 text-red-700">
                                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}
                    </section>

                    {/* Simulation History */}
                    <section>
                        <SimulationHistory history={history} onSelect={loadSimulation} />
                    </section>
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-8">
                    {!ranking && !loading && !error && (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-400 p-8 text-center">
                            <div className="bg-slate-100 p-6 rounded-full mb-4">
                                <Package size={48} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600">Aguardando Dados</h3>
                            <p className="max-w-xs mx-auto mt-2">Preencha o formulário ao lado para que nosso motor encontre as melhores estratégias de envio.</p>
                        </div>
                    )}

                    {ranking && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Toolbar */}
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <h3 className="font-bold text-slate-700">
                                    {ranking.options.length} opções encontradas
                                </h3>
                                <button
                                    onClick={handleShare}
                                    className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                                >
                                    <Share2 size={16} />
                                    Gerar Cotação WhatsApp
                                </button>
                            </div>

                            {/* Best Option Highlight */}
                            {ranking.bestOption && (
                                <FreightCard
                                    option={ranking.bestOption}
                                    isBest={true}
                                />
                            )}

                            {/* Other Options Grid */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                {ranking.options
                                    .filter(opt => opt.id !== ranking.bestOption?.id)
                                    .map(opt => {
                                        const isCheapest = opt.id === ranking.cheapestOption?.id;
                                        const isFastest = opt.id === ranking.fastestOption?.id;

                                        // Calculate savings if this is cheapest
                                        let savings = 0;
                                        if (isCheapest && !ranking.bestOption) {
                                            // complex logic simplified for display
                                        }

                                        return (
                                            <FreightCard
                                                key={opt.id}
                                                option={opt}
                                                isCheapest={isCheapest}
                                                isFastest={isFastest}
                                            />
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
