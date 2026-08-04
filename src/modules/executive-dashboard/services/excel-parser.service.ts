import { parseDesempenhoProdutos } from '../parser/desempenho-produtos.parser';
import { parseDesempenhoPublicacoes } from '../parser/desempenho-publicacoes.parser';
import { parseEvolucaoNegocio } from '../parser/evolucao-negocio.parser';
import {
  DesempenhoProdutoRow,
  DesempenhoPublicacoesRow,
  EvolucaoNegocioRow,
  ReportType,
} from '../types';

export interface ParsedReportsResult {
  evolucaoRows: EvolucaoNegocioRow[];
  publicacoesRows: DesempenhoPublicacoesRow[];
  produtosRows: DesempenhoProdutoRow[];
}

/**
 * Dynamic import for SheetJS (xlsx) to guarantee minimal bundle size
 * and zero impact on initial page load for the CONDSTORE core application.
 */
export async function readExcelFileToJSON(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  return jsonRows;
}

export async function parseReportFile(
  file: File,
  type: ReportType
): Promise<{
  evolucaoRows?: EvolucaoNegocioRow[];
  publicacoesRows?: DesempenhoPublicacoesRow[];
  produtosRows?: DesempenhoProdutoRow[];
  error?: string;
}> {
  try {
    const rawRows = await readExcelFileToJSON(file);

    if (!rawRows || rawRows.length === 0) {
      return { error: `O arquivo ${file.name} está vazio ou sem dados na primeira planilha.` };
    }

    switch (type) {
      case 'EVOLUCAO_NEGOCIO':
        return { evolucaoRows: parseEvolucaoNegocio(rawRows) };
      case 'DESEMPENHO_PUBLICACOES':
        return { publicacoesRows: parseDesempenhoPublicacoes(rawRows) };
      case 'DESEMPENHO_PRODUTO':
        return { produtosRows: parseDesempenhoProdutos(rawRows) };
      default:
        return { error: `Tipo de relatório não reconhecido para o arquivo: ${file.name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido ao ler arquivo Excel';
    return { error: `Falha ao processar ${file.name}: ${msg}` };
  }
}
