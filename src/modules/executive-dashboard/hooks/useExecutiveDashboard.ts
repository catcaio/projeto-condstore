'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  consolidateReportsData,
  createMockConsolidatedData,
} from '../services/normalization.service';
import { parseReportFile } from '../services/excel-parser.service';
import { createSnapshotFromData, getSavedSnapshots } from '../services/snapshot.service';
import {
  loadActiveDashboardData,
  saveActiveDashboardData,
} from '../storage/dashboard-storage';
import {
  ConsolidatedDashboardData,
  DashboardFilters,
  DashboardSnapshot,
  DesempenhoProdutoRow,
  DesempenhoPublicacoesRow,
  EvolucaoNegocioRow,
  FileUploadState,
} from '../types';
import { detectReportTypeFromFileName } from '../utils/report-detector';

export function useExecutiveDashboard() {
  const [activeView, setActiveView] = useState<'dashboard' | 'import' | 'history' | 'channels'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File upload state
  const [files, setFiles] = useState<FileUploadState[]>([]);

  // Raw parsed rows
  const [evolucaoRows, setEvolucaoRows] = useState<EvolucaoNegocioRow[]>([]);
  const [publicacoesRows, setPublicacoesRows] = useState<DesempenhoPublicacoesRow[]>([]);
  const [produtosRows, setProdutosRows] = useState<DesempenhoProdutoRow[]>([]);

  // Active Consolidated Data & Snapshots
  const [dashboardData, setDashboardData] = useState<ConsolidatedDashboardData>(() => {
    return createMockConsolidatedData('Agosto 2026');
  });

  const [snapshots, setSnapshots] = useState<DashboardSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | undefined>();

  // Filter state
  const [filters, setFilters] = useState<DashboardFilters>({
    channel: 'Mercado Livre',
    periodId: '2026-08',
    statusFilter: 'ALL',
    searchQuery: '',
  });

  // Load persisted state on mount
  useEffect(() => {
    const saved = loadActiveDashboardData();
    if (saved) {
      setDashboardData(saved);
    }
    const savedSnaps = getSavedSnapshots();
    setSnapshots(savedSnaps);
  }, []);

  // Handle files selection
  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setErrorMessage(null);
    const newStates: FileUploadState[] = selectedFiles.map((file) => {
      const type = detectReportTypeFromFileName(file.name);
      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toLocaleDateString('pt-BR'),
        status: 'success',
        identifiedType: type,
      };
    });

    setFiles((prev) => {
      const filteredPrev = prev.filter((p) => !newStates.some((n) => n.fileName === p.fileName));
      return [...filteredPrev, ...newStates];
    });
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setErrorMessage(null);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Process all uploaded excel files
  const handleProcessDashboard = useCallback(async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let evol: EvolucaoNegocioRow[] = [];
      let pub: DesempenhoPublicacoesRow[] = [];
      let prod: DesempenhoProdutoRow[] = [];

      for (const fState of files) {
        if (fState.file && fState.identifiedType !== 'DESCONHECIDO') {
          const res = await parseReportFile(fState.file, fState.identifiedType);
          if (res.error) {
            setErrorMessage(res.error);
            setIsProcessing(false);
            return;
          }
          if (res.evolucaoRows) evol = res.evolucaoRows;
          if (res.publicacoesRows) pub = res.publicacoesRows;
          if (res.produtosRows) prod = res.produtosRows;
        }
      }

      setEvolucaoRows(evol);
      setPublicacoesRows(pub);
      setProdutosRows(prod);

      const periodLabel = `Período Importado (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`;
      const consolidated = consolidateReportsData(evol, pub, prod, periodLabel);

      setDashboardData(consolidated);
      saveActiveDashboardData(consolidated);

      // Save snapshot
      const snapshot = createSnapshotFromData(consolidated, periodLabel);
      setSnapshots(getSavedSnapshots());
      setSelectedSnapshotId(snapshot.id);

      setActiveView('dashboard');
    } catch (err) {
      console.error('Erro ao processar relatórios Excel:', err);
      setErrorMessage('Ocorreu um erro ao ler um dos arquivos Excel. Verifique a formatação do arquivo.');
    } finally {
      setIsProcessing(false);
    }
  }, [files]);

  const handleSelectSnapshot = useCallback((snapshot: DashboardSnapshot) => {
    setSelectedSnapshotId(snapshot.id);
    setDashboardData(snapshot.data);
    setActiveView('dashboard');
  }, []);

  const handleUpdateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      channel: 'Mercado Livre',
      periodId: '2026-08',
      statusFilter: 'ALL',
      searchQuery: '',
    });
  }, []);

  // Filtered dataset derived for display
  const filteredProducts = dashboardData.topProducts.filter((p) =>
    filters.searchQuery
      ? p.titulo.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(filters.searchQuery.toLowerCase())
      : true
  );

  const filteredPublications = dashboardData.publications.filter((pub) =>
    filters.searchQuery
      ? pub.titulo.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        pub.mlItemId.toLowerCase().includes(filters.searchQuery.toLowerCase())
      : true
  );

  return {
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
    dashboardData: {
      ...dashboardData,
      topProducts: filteredProducts,
      publications: filteredPublications,
    },
    snapshots,
    selectedSnapshotId,
    handleSelectSnapshot,
    filters,
    handleUpdateFilters,
    handleResetFilters,
    availablePeriods: [
      { id: '2026-08', label: 'Agosto 2026 (Atual)' },
      { id: '2026-07', label: 'Julho 2026' },
      { id: '2026-06', label: 'Junho 2026' },
    ],
  };
}
