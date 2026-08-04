import { EvolucaoNegocioRow } from '../types';

export function parseEvolucaoNegocio(rawRows: Record<string, unknown>[]): EvolucaoNegocioRow[] {
  return rawRows.map((row) => {
    const keys = Object.keys(row);
    
    // Find matching keys flexibly regardless of accent or capitalization differences
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

    const dateVal = getValue(['data', 'período', 'periodo', 'dia']) ?? '';
    const fatVal = getValue(['faturamento', 'bruto', 'vendas r$', 'receita']);
    const undVal = getValue(['unidades', 'quantidade', 'itens']);
    const pedVal = getValue(['pedidos', 'total pedidos']);
    const tickVal = getValue(['ticket', 'médio', 'medio']);
    const visVal = getValue(['visitas', 'acessos', 'visualizações']);
    const convVal = getValue(['conversão', 'conversao', 'taxa']);
    const cancVal = getValue(['cancelamento', 'cancelados', 'devoluções']);

    const faturamento = parseNum(fatVal);
    const unidades = parseNum(undVal);
    const pedidos = parseNum(pedVal) || unidades;
    const ticketMedio = parseNum(tickVal) || (pedidos > 0 ? faturamento / pedidos : 0);

    return {
      data: String(dateVal || new Date().toISOString().substring(0, 10)),
      faturamentoBruto: faturamento,
      unidadesVendidas: unidades,
      pedidosTotal: pedidos,
      ticketMedio,
      visitasTotais: parseNum(visVal),
      taxaConversao: parseNum(convVal),
      cancelamentos: parseNum(cancVal),
    };
  });
}
