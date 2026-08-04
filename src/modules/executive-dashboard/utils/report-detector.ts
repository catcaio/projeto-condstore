import { ReportType } from '../types';

/**
 * Strict detector for the 3 allowed Mercado Livre report filenames:
 * - Relatorio_evolucao_negocio_*.xlsx
 * - Relatorio_desempenho_publicacoes_*.xlsx
 * - Relatorio_desempenho_do_produt_*.xlsx
 */
export function detectReportTypeFromFileName(fileName: string): ReportType {
  const normalized = fileName.toLowerCase().trim();

  // Pattern 1: Relatorio_evolucao_negocio_*.xlsx
  if (
    normalized.startsWith('relatorio_evolucao_negocio') ||
    normalized.includes('evolucao_negocio')
  ) {
    return 'EVOLUCAO_NEGOCIO';
  }

  // Pattern 2: Relatorio_desempenho_publicacoes_*.xlsx
  if (
    normalized.startsWith('relatorio_desempenho_publicacoes') ||
    normalized.includes('desempenho_publicacoes')
  ) {
    return 'DESEMPENHO_PUBLICACOES';
  }

  // Pattern 3: Relatorio_desempenho_do_produt_*.xlsx
  if (
    normalized.startsWith('relatorio_desempenho_do_produt') ||
    normalized.includes('desempenho_do_produt') ||
    normalized.includes('desempenho_produto')
  ) {
    return 'DESEMPENHO_PRODUTO';
  }

  return 'DESCONHECIDO';
}

export function getReportTypeLabel(type: ReportType): string {
  switch (type) {
    case 'EVOLUCAO_NEGOCIO':
      return 'Evolução do Negócio';
    case 'DESEMPENHO_PUBLICACOES':
      return 'Desempenho de Publicações';
    case 'DESEMPENHO_PRODUTO':
      return 'Desempenho do Produto';
    default:
      return 'Arquivo Não Permitido / Não Identificado';
  }
}
