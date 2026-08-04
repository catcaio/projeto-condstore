import { DesempenhoPublicacoesRow } from '../types';

export function parseDesempenhoPublicacoes(rawRows: Record<string, unknown>[]): DesempenhoPublicacoesRow[] {
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

    const idVal = getValue(['mlb', 'id', 'código', 'codigo', 'item']) ?? `MLB-${index + 1000}`;
    const titVal = getValue(['título', 'titulo', 'nome', 'anúncio', 'anuncio']) ?? 'Anúncio sem título';
    const tipoVal = getValue(['tipo', 'exposição', 'exposicao', 'modalidade']) ?? 'Clássico';
    const statusVal = getValue(['status', 'estado', 'situação']) ?? 'Ativo';
    const precoVal = getValue(['preço', 'preco', 'valor']);
    const fatVal = getValue(['faturamento', 'receita', 'vendas r$']);
    const undVal = getValue(['unidades', 'quantidade', 'vendas']);
    const visVal = getValue(['visitas', 'acessos']);
    const convVal = getValue(['conversão', 'conversao']);
    const qualVal = getValue(['qualidade', 'score']);

    return {
      mlItemId: String(idVal),
      titulo: String(titVal),
      tipoAnuncio: String(tipoVal),
      status: String(statusVal),
      preco: parseNum(precoVal),
      faturamento: parseNum(fatVal),
      unidadesVendidas: parseNum(undVal),
      visitas: parseNum(visVal),
      conversao: parseNum(convVal),
      qualidadeAnuncio: parseNum(qualVal),
    };
  });
}
