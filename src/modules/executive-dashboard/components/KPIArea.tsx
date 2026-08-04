'use client';

import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Eye,
  Package,
  Percent,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { DashboardKPIs } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface KPIAreaProps {
  kpis: DashboardKPIs;
}

export const KPIArea: React.FC<KPIAreaProps> = ({ kpis }) => {
  const cards = [
    {
      title: 'Faturamento Bruto',
      value: formatCurrency(kpis.faturamentoTotal),
      variation: kpis.variacaoFaturamento,
      icon: <DollarSign className="h-5 w-5 text-emerald-400" />,
      bgGradient: 'from-emerald-500/10 to-teal-500/5',
      borderColor: 'border-emerald-500/20',
      description: 'Faturamento acumulado no período',
    },
    {
      title: 'Total de Vendas',
      value: formatNumber(kpis.totalVendas),
      variation: kpis.variacaoVendas,
      icon: <ShoppingBag className="h-5 w-5 text-blue-400" />,
      bgGradient: 'from-blue-500/10 to-indigo-500/5',
      borderColor: 'border-blue-500/20',
      description: 'Unidades vendidas confirmadas',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(kpis.ticketMedio),
      variation: kpis.variacaoTicketMedio,
      icon: <TrendingUp className="h-5 w-5 text-indigo-400" />,
      bgGradient: 'from-indigo-500/10 to-purple-500/5',
      borderColor: 'border-indigo-500/20',
      description: 'Valor médio gasto por pedido',
    },
    {
      title: 'Anúncios Ativos',
      value: formatNumber(kpis.anunciosAtivos),
      variation: null,
      icon: <Package className="h-5 w-5 text-amber-400" />,
      bgGradient: 'from-amber-500/10 to-orange-500/5',
      borderColor: 'border-amber-500/20',
      description: 'Publicações ativas no canal',
    },
    {
      title: 'Visitas Totais',
      value: formatNumber(kpis.visitasTotais),
      variation: 11.2,
      icon: <Eye className="h-5 w-5 text-cyan-400" />,
      bgGradient: 'from-cyan-500/10 to-blue-500/5',
      borderColor: 'border-cyan-500/20',
      description: 'Acessos acumulados em anúncios',
    },
    {
      title: 'Taxa de Conversão',
      value: formatPercent(kpis.taxaConversaoMedia),
      variation: 0.4,
      icon: <Percent className="h-5 w-5 text-violet-400" />,
      bgGradient: 'from-violet-500/10 to-fuchsia-500/5',
      borderColor: 'border-violet-500/20',
      description: 'Conversão média (Vendas / Visitas)',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-slate-900/80 bg-gradient-to-br ${card.bgGradient} p-4 backdrop-blur-md shadow-lg shadow-black/20 transition-all hover:scale-[1.01]`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{card.title}</span>
            <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-2">
              {card.icon}
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {card.value}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              {card.variation !== null ? (
                <div
                  className={`flex items-center font-medium ${
                    card.variation >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {card.variation >= 0 ? (
                    <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
                  )}
                  <span>
                    {card.variation >= 0 ? '+' : ''}
                    {card.variation}% vs anterior
                  </span>
                </div>
              ) : (
                <span className="text-slate-400">Canal ativo</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};
