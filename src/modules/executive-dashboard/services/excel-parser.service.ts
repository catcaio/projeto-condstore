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
 * Dynamic import for read-excel-file to guarantee minimal bundle size
 * and zero impact on initial page load for the CONDSTORE core application.
 */
export async function readExcelFileToJSON(file: File): Promise<Record<string, unknown>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readXlsxFileModule: any = await import('read-excel-file/browser');
  const readXlsxFile = readXlsxFileModule.default || readXlsxFileModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await readXlsxFile(file, { dateFormat: 'yyyy-mm-dd' });

  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h: unknown) => String(h ?? '').trim());
  const jsonRows: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((val: unknown) => val === null || val === undefined || val === '')) {
      continue;
    }

    const rowObj: Record<string, unknown> = {};
    headers.forEach((header: string, colIdx: number) => {
      if (header) {
        rowObj[header] = row[colIdx] ?? '';
      }
    });

    jsonRows.push(rowObj);
  }

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
