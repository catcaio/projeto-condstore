'use client';

import React, { useState } from 'react';
import {
  BarChart2,
  ExternalLink,
  Layers,
  LineChart,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import {
  ChartDataPoint,
  PublicationPerformance,
  TopProductMetric,
} from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface ChartsAreaProps {
  timeSeries: ChartDataPoint[];
  topProducts: TopProductMetric[];
  publications: PublicationPerformance[];
}

export const ChartsArea: React.FC<ChartsAreaProps> = ({
  timeSeries,
  topProducts,
  publications,
}) => {
  const [metricTab, setMetricTab] = useState<'faturamento' | 'unidades'>('faturamento');

  // Compute max for dynamic SVG heights
  const maxVal = Math.max(
    ...timeSeries.map((d) => (metricTab === 'faturamento' ? d.faturamento : d.unidades)),
    1
  );

  const maxProdFat = Math.max(...topProducts.map((p) => p.faturamento), 1);

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Evolution Chart (Spans 2 cols) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Evolução de Vendas no Período</h2>
            </div>
            <p className="text-xs text-slate-400">
              Desempenho diário de faturamento e volume de unidades vendidas
            </p>
          </div>

          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              onClick={() => setMetricTab('faturamento')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                metricTab === 'faturamento'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Faturamento (R$)
            </button>
            <button
              onClick={() => setMetricTab('unidades')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                metricTab === 'unidades'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unidades (Qtd)
            </button>
          </div>
        </div>

        {/* Visual Bar & Line Chart Representation */}
        <div className="h-64 w-full flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
          {timeSeries.map((pt, idx) => {
            const currentVal = metricTab === 'faturamento' ? pt.faturamento : pt.unidades;
            const heightPercent = Math.max(10, Math.min(100, (currentVal / maxVal) * 100));

            return (
              <div
                key={idx}
                className="group relative flex-1 flex flex-col items-center h-full justify-end"
              >
                {/* Hover Tooltip */}
                <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center rounded-lg bg-slate-950 px-2.5 py-1 text-[11px] text-white border border-slate-700 shadow-xl whitespace-nowrap">
                  <span className="font-semibold">{pt.label}</span>
                  <span className="text-blue-400">
                    {metricTab === 'faturamento'
                      ? formatCurrency(pt.faturamento)
                      : `${pt.unidades} un.`}
                  </span>
                </div>

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 opacity-85 transition-all group-hover:opacity-100 group-hover:shadow-lg group-hover:shadow-blue-500/30"
                />

                <span className="mt-2 text-[10px] font-medium text-slate-400 truncate w-full text-center">
                  {pt.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              {metricTab === 'faturamento' ? 'Faturamento Diário' : 'Unidades Vendidas'}
            </span>
          </div>
          <span>Total de pontos: {timeSeries.length} dias</span>
        </div>
      </div>

      {/* Top 5 Products (Curva ABC) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Top Produtos (Curva ABC)</h2>
          </div>
          <span className="text-xs text-emerald-400 font-semibold">Participação %</span>
        </div>

        <div className="space-y-4">
          {topProducts.slice(0, 5).map((prod, idx) => {
            const barWidth = Math.max(8, (prod.faturamento / maxProdFat) * 100);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                    {prod.sku} - {prod.titulo}
                  </span>
                  <span className="font-bold text-white">
                    {formatCurrency(prod.faturamento)}
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{prod.unidades} un. vendidas</span>
                  <span className="text-emerald-400 font-medium">{prod.participacao}% do total</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Publication Breakdown (Full width bottom row inside grid) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Desempenho de Publicações (Anúncios ML)</h2>
          </div>
          <span className="text-xs text-slate-400">Mostrando top anúncios por volume</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">MLB ID</th>
                <th className="py-3 px-4">Título do Anúncio</th>
                <th className="py-3 px-4 text-right">Faturamento</th>
                <th className="py-3 px-4 text-right">Unidades</th>
                <th className="py-3 px-4 text-right">Visitas</th>
                <th className="py-3 px-4 text-right">Conversão</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {publications.slice(0, 5).map((pub, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-blue-400 font-medium">
                    {pub.mlItemId}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-200 truncate max-w-xs">
                    {pub.titulo}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">
                    {formatCurrency(pub.faturamento)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-200">
                    {formatNumber(pub.unidades)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {formatNumber(pub.visitas)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-violet-400">
                    {formatPercent(pub.conversao)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {pub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
