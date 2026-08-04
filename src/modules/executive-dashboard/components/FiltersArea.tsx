'use client';

import React from 'react';
import {
  Calendar,
  Filter,
  Layers,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DashboardFilters } from '../types';

interface FiltersAreaProps {
  filters: DashboardFilters;
  onChangeFilters: (newFilters: Partial<DashboardFilters>) => void;
  onResetFilters: () => void;
  availablePeriods: { id: string; label: string }[];
}

export const FiltersArea: React.FC<FiltersAreaProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  availablePeriods,
}) => {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md shadow-lg">
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mr-1">
          <Filter className="h-4 w-4 text-blue-400" />
          <span>Filtros do Dashboard:</span>
        </div>

        {/* Channel Filter (Mercado Livre preset, architecture ready for multi-channel) */}
        <div className="relative">
          <select
            value={filters.channel}
            onChange={(e) => onChangeFilters({ channel: e.target.value })}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 pr-8 text-xs font-semibold text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="Mercado Livre">Mercado Livre (Ativo)</option>
            <option value="Mercado Ads" disabled>
              Mercado Ads (Em breve)
            </option>
            <option value="Google Ads" disabled>
              Google Ads (Em breve)
            </option>
            <option value="ERP / Financeiro" disabled>
              ERP / Financeiro (Em breve)
            </option>
          </select>
        </div>

        {/* Period Selector */}
        <div className="relative">
          <select
            value={filters.periodId}
            onChange={(e) => onChangeFilters({ periodId: e.target.value })}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 pr-8 text-xs font-semibold text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            {availablePeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search query filter */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por anúncio, SKU ou título..."
            value={filters.searchQuery}
            onChange={(e) => onChangeFilters({ searchQuery: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Limpar Filtros</span>
        </button>
      </div>
    </section>
  );
};
