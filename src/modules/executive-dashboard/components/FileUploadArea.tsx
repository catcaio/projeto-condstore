'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { FileUploadState, ReportType } from '../types';
import { formatFileSize, formatDate } from '../utils/formatters';
import { detectReportTypeFromFileName, getReportTypeLabel } from '../utils/report-detector';

interface FileUploadAreaProps {
  files: FileUploadState[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onProcessDashboard: () => void;
  isProcessing: boolean;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  files,
  onFilesSelected,
  onRemoveFile,
  onProcessDashboard,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files);
      onFilesSelected(selected);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
    }
  };

  // Check required types present
  const hasEvolucao = files.some((f) => f.identifiedType === 'EVOLUCAO_NEGOCIO');
  const hasPublicacoes = files.some((f) => f.identifiedType === 'DESEMPENHO_PUBLICACOES');
  const hasProdutos = files.some((f) => f.identifiedType === 'DESEMPENHO_PRODUTO');

  const allThreeReady = hasEvolucao && hasPublicacoes && hasProdutos;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Importar Relatórios Mercado Livre</h2>
            <p className="text-xs text-slate-400">
              Selecione ou arraste os 3 arquivos Excel (.xlsx) exportados do painel do Mercado Livre
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Reports Requirements Box */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs transition-all ${
            hasEvolucao
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-800 bg-slate-950/70 text-slate-400'
          }`}
        >
          {hasEvolucao ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold text-slate-200 block">1. Evolução do Negócio</span>
            <span className="text-[11px] font-mono">Relatorio_evolucao_negocio_*.xlsx</span>
          </div>
        </div>

        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs transition-all ${
            hasPublicacoes
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-800 bg-slate-950/70 text-slate-400'
          }`}
        >
          {hasPublicacoes ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold text-slate-200 block">2. Desempenho Publicações</span>
            <span className="text-[11px] font-mono">Relatorio_desempenho_publicacoes_*.xlsx</span>
          </div>
        </div>

        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs transition-all ${
            hasProdutos
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-800 bg-slate-950/70 text-slate-400'
          }`}
        >
          {hasProdutos ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold text-slate-200 block">3. Desempenho do Produto</span>
            <span className="text-[11px] font-mono">Relatorio_desempenho_do_produt_*.xlsx</span>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-950/60 hover:border-slate-500 hover:bg-slate-950/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-blue-400 shadow-inner mb-3">
          <UploadCloud className="h-7 w-7" />
        </div>

        <p className="text-sm font-bold text-white">
          Arraste e solte seus arquivos Excel aqui
        </p>
        <p className="text-xs text-slate-400 mt-1">
          ou clique para selecionar os arquivos `.xlsx` no seu computador
        </p>
        <span className="mt-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200">
          Selecionar Arquivos
        </span>
      </div>

      {/* Loaded Files List */}
      {files.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Arquivos Carregados ({files.length})
          </h3>

          <div className="space-y-2">
            {files.map((fileState) => (
              <div
                key={fileState.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 transition-all"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs truncate max-w-xs">
                        {fileState.fileName}
                      </span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        ✔ Carregado
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span>Tamanho: {formatFileSize(fileState.fileSize)}</span>
                      <span>•</span>
                      <span>Data: {fileState.uploadDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-blue-400">
                      {getReportTypeLabel(fileState.identifiedType)}
                    </span>
                    <span className="text-[10px] text-slate-400">Tipo Identificado</span>
                  </div>

                  <button
                    onClick={() => onRemoveFile(fileState.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                    title="Remover arquivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Button */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="text-xs text-slate-400">
          {allThreeReady ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Todos os 3 relatórios obrigatórios foram selecionados e identificados!
            </span>
          ) : (
            <span className="text-amber-400 font-medium">
              Selecione os 3 relatórios para habilitar a atualização completa do dashboard.
            </span>
          )}
        </div>

        <button
          onClick={onProcessDashboard}
          disabled={isProcessing}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all ${
            allThreeReady
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Sparkles className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Processando Relatórios...' : 'Atualizar Dashboard'}</span>
        </button>
      </div>
    </section>
  );
};
