'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AutomatedInsight } from '../types';

interface InsightsAreaProps {
  insights: AutomatedInsight[];
}

export const InsightsArea: React.FC<InsightsAreaProps> = ({ insights }) => {
  const getInsightIcon = (type: AutomatedInsight['type']) => {
    switch (type) {
      case 'positive':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-amber-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-rose-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getInsightBadge = (type: AutomatedInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'opportunity':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'warning':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Insights Automáticos Executivos</h2>
            <p className="text-xs text-slate-400">
              Análise inteligente gerada a partir da consolidação dos relatórios
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Pronto para IA Futura</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition-all hover:border-slate-700"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getInsightIcon(insight.type)}
                  <span className="text-xs font-bold text-white truncate max-w-[180px]">
                    {insight.title}
                  </span>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getInsightBadge(
                    insight.type
                  )}`}
                >
                  {insight.type.toUpperCase()}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-300">
                {insight.description}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Impacto estimado:</span>
              <span className="font-bold text-white">{insight.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
