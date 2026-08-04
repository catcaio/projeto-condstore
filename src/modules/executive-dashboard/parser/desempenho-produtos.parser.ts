import { DesempenhoProdutoRow } from '../types';

export function parseDesempenhoProdutos(rawRows: Record<string, unknown>[]): DesempenhoProdutoRow[] {
  return rawRows.map((row, index) => {
    const keys = Object.keys(row);
    const getValue = (patterns: string[]): unknown => {
      const matchKey = keys.find((k) => patterns.some((p) => k.toLowerCase().includes(p.toLowerCase())));
      return matchKey ? row[matchKey] : undefined;
    };

    const parseNum = (val: unknown): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    const skuVal = getValue(['sku', 'código produto', 'codigo', 'id']) ?? `SKU-${index + 100}`;
    const titVal = getValue(['produto', 'título', 'titulo', 'nome']) ?? 'Produto sem nome';
    const catVal = getValue(['categoria', 'departamento', 'seção']) ?? 'Geral';
    const undVal = getValue(['unidades', 'quantidade', 'vendas']);
    const fatVal = getValue(['faturamento', 'receita', 'vendas r$']);
    const estVal = getValue(['estoque', 'disponível', 'disponivel']);
    const partVal = getValue(['participação', 'participacao', '%']);

    return {
      sku: String(skuVal),
      titulo: String(titVal),
      categoria: String(catVal),
      unidadesVendidas: parseNum(undVal),
      faturamento: parseNum(fatVal),
      estoqueDisponivel: parseNum(estVal),
      participacaoFaturamento: parseNum(partVal),
    };
  });
}
