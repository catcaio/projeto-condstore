'use client';

import React from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Menu,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeView: 'dashboard' | 'import' | 'history' | 'channels';
  onNavigate: (view: 'dashboard' | 'import' | 'history' | 'channels') => void;
  updatedAt?: string;
  periodLabel?: string;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  activeView,
  onNavigate,
  updatedAt,
  periodLabel = 'Agosto 2026',
  isProcessing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-md transition-all sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Alternar Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Executive Dashboard
              </h1>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                v1.0 ML
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Inteligência comercial & analytics de performance
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Period Badge */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 md:flex">
          <Calendar className="h-3.5 w-3.5 text-blue-400" />
          <span>{periodLabel}</span>
        </div>

        {/* Last update */}
        {updatedAt && (
          <div className="hidden text-xs text-slate-400 xl:flex items-center gap-1">
            <RefreshCw className={`h-3 w-3 text-emerald-400 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Atualizado: {formatDate(updatedAt)}</span>
          </div>
        )}

        {/* Quick Nav Button */}
        {activeView === 'dashboard' ? (
          <button
            onClick={() => onNavigate('import')}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Relatórios</span>
            <span className="sm:hidden">Importar</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span>Ver Dashboard</span>
          </button>
        )}
      </div>
    </header>
  );
};
