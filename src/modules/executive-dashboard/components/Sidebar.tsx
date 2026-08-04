'use client';

import React from 'react';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  Info,
  Layers,
  LayoutDashboard,
  Upload,
} from 'lucide-react';
import { SIDEBAR_NAV_ITEMS } from '../routes';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeView: 'dashboard' | 'import' | 'history' | 'channels';
  onNavigate: (view: 'dashboard' | 'import' | 'history' | 'channels') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeView,
  onNavigate,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className="h-4 w-4" />;
      case 'Upload':
        return <Upload className="h-4 w-4" />;
      case 'History':
        return <History className="h-4 w-4" />;
      case 'Layers':
        return <Layers className="h-4 w-4" />;
      default:
        return <BarChart2 className="h-4 w-4" />;
    }
  };

  return (
    <aside
      className={`fixed left-0 top-16 z-20 flex h-[calc(100vh-4rem)] flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-md transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Navigation List */}
      <div className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${!isOpen && 'sr-only'}`}>
          Navegação Principal
        </div>

        {SIDEBAR_NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
              }`}
              title={!isOpen ? item.label : undefined}
            >
              <div className={isActive ? 'text-blue-400' : 'text-slate-400'}>
                {getIcon(item.iconName)}
              </div>

              {isOpen && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        item.badge === 'Excel'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      {isOpen ? (
        <div className="m-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300 mb-1">
            <Database className="h-3.5 w-3.5 text-blue-400" />
            <span>Módulo Isolado</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Analytics executivo desacoplado. Processamento 100% no navegador.
          </p>
        </div>
      ) : (
        <div className="p-3 text-center">
          <Info className="h-4 w-4 text-slate-400 mx-auto" />
        </div>
      )}

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  );
};
