'use client';

import React from 'react';
import { ChartsArea } from '../components/ChartsArea';
import { FileUploadArea } from '../components/FileUploadArea';
import { FiltersArea } from '../components/FiltersArea';
import { Header } from '../components/Header';
import { InsightsArea } from '../components/InsightsArea';
import { KPIArea } from '../components/KPIArea';
import { Sidebar } from '../components/Sidebar';
import { SnapshotHistory } from '../components/SnapshotHistory';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';
import { Layers } from 'lucide-react';
import type { DashboardStorageScope } from '../storage/dashboard-storage';

export const ExecutiveDashboardPage: React.FC<{ scope: DashboardStorageScope }> = ({ scope }) => {
  const {
    activeView,
    setActiveView,
    sidebarOpen,
    setSidebarOpen,
    isProcessing,
    errorMessage,
    files,
    handleFilesSelected,
    handleRemoveFile,
    handleProcessDashboard,
    dashboardData,
    snapshots,
    selectedSnapshotId,
    handleSelectSnapshot,
    filters,
    handleUpdateFilters,
    handleResetFilters,
    availablePeriods,
    loadDemonstration,
  } = useExecutiveDashboard(scope);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Fixed Header */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        activeView={activeView}
        onNavigate={setActiveView}
        updatedAt={dashboardData?.updatedAt ?? ''}
        periodLabel={dashboardData?.periodLabel ?? 'Nenhum registro disponível'}
        isProcessing={isProcessing}
      />

      {/* Main Layout Container */}
      <div className="flex pt-16">
        {/* Collapsible Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          activeView={activeView}
          onNavigate={setActiveView}
        />

        {/* Content Area */}
        <main
          className={`flex-1 transition-all duration-300 p-4 sm:p-6 lg:p-8 space-y-6 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          }`}
        >
          <aside role="note" className="rounded-xl border border-amber-500 bg-amber-950 p-4 text-sm text-amber-100">
            <strong>Laboratório demonstrativo — uso administrativo.</strong>{' '}
            {dashboardData?.dataKind === 'demonstration' ? 'Os números exibidos são fictícios. ' : ''}
            Importações locais e parsers ainda exigem homologação; estes números não são indicadores operacionais.
            Não há integração comercial ativa. Snapshots ficam somente neste navegador e não são compartilhados.
            {' '}<a className="underline" href="/cockpit/gestao-ecommerce">Abrir Cockpit Operacional</a>
          </aside>
          {activeView === 'dashboard' && !dashboardData && (
            <section className="rounded-xl border border-slate-700 p-6 space-y-4">
              <h1 className="text-xl font-semibold">Nenhum registro disponível</h1>
              <p>Importe um relatório para avaliação local ou abra o exemplo explicitamente fictício.</p>
              <button type="button" className="rounded-lg border border-slate-500 p-3" onClick={loadDemonstration}>Carregar demonstração fictícia</button>
            </section>
          )}
          {activeView === 'dashboard' && dashboardData && (
            <>
              {/* Filters Area */}
              <FiltersArea
                filters={filters}
                onChangeFilters={handleUpdateFilters}
                onResetFilters={handleResetFilters}
                availablePeriods={availablePeriods}
              />

              {/* KPI Cards Grid */}
              <KPIArea kpis={dashboardData.kpis} />

              {/* Charts & Graphs Area */}
              <ChartsArea
                timeSeries={dashboardData.timeSeries}
                topProducts={dashboardData.topProducts}
                publications={dashboardData.publications}
              />

              {/* Automated Insights Area */}
              <InsightsArea insights={dashboardData.insights} />
            </>
          )}

          {activeView === 'import' && (
            <FileUploadArea
              files={files}
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              onProcessDashboard={handleProcessDashboard}
              isProcessing={isProcessing}
              errorMessage={errorMessage}
            />
          )}

          {activeView === 'history' && (
            <SnapshotHistory
              snapshots={snapshots}
              selectedSnapshotId={selectedSnapshotId}
              onSelectSnapshot={handleSelectSnapshot}
            />
          )}

          {activeView === 'channels' && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center backdrop-blur-md shadow-xl max-w-2xl mx-auto space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mx-auto">
                <Layers className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Plataforma Multi-Canal de Dashboards</h2>
              <p className="text-xs leading-relaxed text-slate-400">
                A arquitetura deste módulo foi construída de forma modular para integrar conectores futuros de:
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-300 text-left pt-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Mercado Livre (importação local; conector não implementado)
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" /> Mercado Ads (não implementado)
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Google Ads (não implementado)
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-400" /> ERP / Financeiro / Estoque
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
