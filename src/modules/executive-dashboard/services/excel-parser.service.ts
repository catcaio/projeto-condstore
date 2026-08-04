import * as XLSX from 'xlsx';
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

export async function readExcelFileToJSON(file: File): Promise<Record<string, unknown>[]> {
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
}> {
  const rawRows = await readExcelFileToJSON(file);

  switch (type) {
    case 'EVOLUCAO_NEGOCIO':
      return { evolucaoRows: parseEvolucaoNegocio(rawRows) };
    case 'DESEMPENHO_PUBLICACOES':
      return { publicacoesRows: parseDesempenhoPublicacoes(rawRows) };
    case 'DESEMPENHO_PRODUTO':
      return { produtosRows: parseDesempenhoProdutos(rawRows) };
    default:
      throw new Error(`Tipo de relatório não suportado: ${type}`);
  }
}
