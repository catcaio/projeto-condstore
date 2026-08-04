'use client';

import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  History,
  TrendingUp,
} from 'lucide-react';
import { DashboardSnapshot } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface SnapshotHistoryProps {
  snapshots: DashboardSnapshot[];
  selectedSnapshotId?: string;
  onSelectSnapshot: (snapshot: DashboardSnapshot) => void;
}

export const SnapshotHistory: React.FC<SnapshotHistoryProps> = ({
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
}) => {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Histórico de Snapshots Importados</h2>
            <p className="text-xs text-slate-400">
              Gerencie e navegue pelos períodos importados para comparar o desempenho mensal
            </p>
          </div>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
          <Database className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300">Nenhum snapshot salvo ainda</p>
          <p className="mt-1">
            Importe os relatórios na aba "Importar Relatórios ML" para gerar o primeiro snapshot de período.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snapshots.map((snap) => {
            const isSelected = selectedSnapshotId === snap.id;
            return (
              <div
                key={snap.id}
                onClick={() => onSelectSnapshot(snap)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="font-bold text-white text-sm">{snap.periodLabel}</span>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Faturamento:</span>
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(snap.data.kpis.faturamentoTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Vendas:</span>
                    <span className="font-semibold">{snap.data.kpis.totalVendas} un.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Canal:</span>
                    <span className="text-blue-400 font-medium">{snap.channel}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDate(snap.importedAt)}
                  </span>
                  <span className="text-blue-400 font-semibold hover:underline">
                    Ver snapshot →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
