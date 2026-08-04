import { ReportType } from '../types';

export function detectReportTypeFromFileName(fileName: string): ReportType {
  const normalized = fileName.toLowerCase().trim();

  if (
    normalized.includes('relatorio_evolucao_negocio') ||
    normalized.includes('evolucao_negocio') ||
    normalized.includes('evolucaonegocio')
  ) {
    return 'EVOLUCAO_NEGOCIO';
  }

  if (
    normalized.includes('relatorio_desempenho_publicacoes') ||
    normalized.includes('desempenho_publicacoes') ||
    normalized.includes('publicacoes')
  ) {
    return 'DESEMPENHO_PUBLICACOES';
  }

  if (
    normalized.includes('relatorio_desempenho_do_produt') ||
    normalized.includes('desempenho_do_produto') ||
    normalized.includes('desempenho_produto') ||
    normalized.includes('produt')
  ) {
    return 'DESEMPENHO_PRODUTO';
  }

  return 'DESCONHECIDO';
}

export function getReportTypeLabel(type: ReportType): string {
  switch (type) {
    case 'EVOLUCAO_NEGOCIO':
      return 'Evolução do Negócio (Mercado Livre)';
    case 'DESEMPENHO_PUBLICACOES':
      return 'Desempenho de Publicações (Mercado Livre)';
    case 'DESEMPENHO_PRODUTO':
      return 'Desempenho do Produto (Mercado Livre)';
    default:
      return 'Relatório Não Identificado';
  }
}
