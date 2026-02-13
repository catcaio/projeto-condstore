import { FreightOption } from '@/types/freight';
import { Truck, Clock, DollarSign, CheckCircle2, Zap, TrendingDown } from 'lucide-react';

interface FreightCardProps {
    option: FreightOption;
    isBest?: boolean;
    isCheapest?: boolean;
    isFastest?: boolean;
    savings?: number; // Amount cheaper than the next option
}

export function FreightCard({ option, isBest, isCheapest, isFastest, savings }: FreightCardProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className={`
      relative rounded-xl p-4 transition-all border
      ${isBest
                ? 'bg-white border-green-500 shadow-md ring-1 ring-green-500/20'
                : 'bg-white border-slate-100 hover:border-blue-200'
            }
    `}>
            {/* Badges */}
            <div className="absolute -top-3 left-4 flex gap-2">
                {isBest && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-green-200">
                        <CheckCircle2 size={12} /> MELHOR CUSTO-BENEFÍCIO
                    </span>
                )}
                {isFastest && !isBest && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-amber-200">
                        <Zap size={12} /> MAIS RÁPIDO
                    </span>
                )}
                {isCheapest && !isBest && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-blue-200">
                        <TrendingDown size={12} /> MAIS BARATO
                    </span>
                )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                {/* Carrier Info */}
                <div className="flex items-center gap-3">
                    <div className={`
            h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg
            ${isBest ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}
          `}>
                        {option.carrier.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">{option.carrier}</h3>
                        <p className="text-xs text-slate-500">{option.service}</p>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                        <p className="text-slate-500 text-xs flex items-center justify-end gap-1 mb-0.5">
                            <Clock size={12} /> Prazo
                        </p>
                        <p className="font-semibold text-slate-900">{option.deliveryDays} dias</p>
                    </div>

                    <div className="text-right min-w-[80px]">
                        <p className="text-slate-500 text-xs flex items-center justify-end gap-1 mb-0.5">
                            <DollarSign size={12} /> Valor
                        </p>
                        <p className={`text-lg font-bold ${isBest ? 'text-green-600' : 'text-slate-900'}`}>
                            {formatCurrency(option.price)}
                        </p>
                    </div>
                </div>
            </div>

            {savings && savings > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-green-600 font-medium text-center">
                    Economia de {formatCurrency(savings)} em relação à próxima opção
                </div>
            )}
        </div>
    );
}
