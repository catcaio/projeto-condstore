import { Simulation } from '@/types/freight';
import { History, Calendar, Package, ArrowRight } from 'lucide-react';

interface SimulationHistoryProps {
    history: Simulation[];
    onSelect: (sim: Simulation) => void;
}

export function SimulationHistory({ history, onSelect }: SimulationHistoryProps) {
    if (history.length === 0) return null;

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(dateStr));
        } catch (e) {
            return 'Data inválida';
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
                <History size={20} className="text-blue-600" />
                Últimas Simulações
            </h2>

            <div className="space-y-3">
                {history.map((sim) => (
                    <button
                        key={sim.id}
                        onClick={() => onSelect(sim)}
                        className="w-full text-left bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-slate-900 font-medium">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-mono">
                                    {sim.input.cep}
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500">
                                    {sim.input.quantity} un ({sim.input.weight}kg)
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar size={10} />
                                {formatDate(sim.date)}
                            </span>
                        </div>

                        {sim.ranking.bestOption && (
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-green-700">
                                    <Package size={14} />
                                    <span className="font-semibold">{sim.ranking.bestOption.carrier}</span>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
