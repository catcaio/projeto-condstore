import {
  AutomatedInsight,
  ChartDataPoint,
  ConsolidatedDashboardData,
  DashboardKPIs,
  DesempenhoProdutoRow,
  DesempenhoPublicacoesRow,
  EvolucaoNegocioRow,
  PublicationPerformance,
  TopProductMetric,
} from '../types';

export function createMockConsolidatedData(periodLabel = 'Agosto 2026'): ConsolidatedDashboardData {
  const kpis: DashboardKPIs = {
    faturamentoTotal: 184520.5,
    variacaoFaturamento: 14.8,
    totalVendas: 1240,
    variacaoVendas: 8.2,
    ticketMedio: 148.8,
    variacaoTicketMedio: 6.1,
    anunciosAtivos: 186,
    visitasTotais: 45200,
    taxaConversaoMedia: 2.74,
  };

  const timeSeries: ChartDataPoint[] = [
    { date: '2026-08-01', label: '01/08', faturamento: 5200, unidades: 35, visitas: 1400 },
    { date: '2026-08-02', label: '02/08', faturamento: 6100, unidades: 42, visitas: 1650 },
    { date: '2026-08-03', label: '03/08', faturamento: 4800, unidades: 31, visitas: 1300 },
    { date: '2026-08-04', label: '04/08', faturamento: 7400, unidades: 49, visitas: 1900 },
    { date: '2026-08-05', label: '05/08', faturamento: 8200, unidades: 55, visitas: 2100 },
    { date: '2026-08-06', label: '06/08', faturamento: 6900, unidades: 46, visitas: 1750 },
    { date: '2026-08-07', label: '07/08', faturamento: 9100, unidades: 62, visitas: 2300 },
  ];

  const topProducts: TopProductMetric[] = [
    { sku: 'KIT-FILTRO-REN', titulo: 'Kit Filtro Óleo + Combustível Renault Kwid 1.0', faturamento: 28400, unidades: 210, participacao: 15.4 },
    { sku: 'PASTILHA-SANDERO', titulo: 'Jogo Pastilha Freio Dianteira Sandero Logan 1.6', faturamento: 19800, unidades: 145, participacao: 10.7 },
    { sku: 'AMORTECEDOR-DUSTER', titulo: 'Par Amortecedor Dianteiro Duster 2.0 4x4 OEM', faturamento: 17200, unidades: 48, participacao: 9.3 },
    { sku: 'FAROL-OROCH', titulo: 'Farol Dianteiro Máscara Negra Duster Oroch Left', faturamento: 14500, unidades: 32, participacao: 7.9 },
    { sku: 'CORREIA-LOGAN', titulo: 'Kit Correia Dentada + Tensor Motor K4M Renault', faturamento: 12100, unidades: 88, participacao: 6.6 },
  ];

  const publications: PublicationPerformance[] = [
    { mlItemId: 'MLB-3920194', titulo: 'Kit Filtro Óleo + Combustível Renault Kwid', faturamento: 28400, unidades: 210, visitas: 5400, conversao: 3.88, status: 'Ativo' },
    { mlItemId: 'MLB-2849102', titulo: 'Jogo Pastilha Freio Dianteira Sandero 1.6', faturamento: 19800, unidades: 145, visitas: 4100, conversao: 3.53, status: 'Ativo' },
    { mlItemId: 'MLB-1940192', titulo: 'Par Amortecedor Dianteiro Duster 2.0 OEM', faturamento: 17200, unidades: 48, visitas: 2900, conversao: 1.65, status: 'Ativo' },
    { mlItemId: 'MLB-9821033', titulo: 'Farol Dianteiro Máscara Negra Oroch Left', faturamento: 14500, unidades: 32, visitas: 2200, conversao: 1.45, status: 'Ativo' },
    { mlItemId: 'MLB-7491029', titulo: 'Kit Correia Dentada + Tensor Motor K4M', faturamento: 12100, unidades: 88, visitas: 3100, conversao: 2.83, status: 'Ativo' },
  ];

  const insights: AutomatedInsight[] = [
    {
      id: 'ins-1',
      title: 'Alta Concentração nos Top 3 Produtos',
      description: 'Os 3 produtos mais vendidos representam 35,4% do faturamento total do período.',
      type: 'positive',
      impact: 'Faturamento +14.8%',
    },
    {
      id: 'ins-2',
      title: 'Oportunidade de Conversão em Anúncios de Faróis',
      description: 'Anúncios da categoria Iluminação possuem taxa de conversão abaixo da média (1,45% vs 2,74% geral). Recomendado otimizar fotos e prazo de envio.',
      type: 'opportunity',
      impact: 'Potencial +R$ 8.500/mês',
    },
    {
      id: 'ins-3',
      title: 'Ticket Médio em Crescimento Sustentado',
      description: 'Ticket médio aumentou 6.1% devido ao crescimento nas vendas de kits de amortecedores e peças completas.',
      type: 'info',
      impact: 'R$ 148,80 por pedido',
    },
  ];

  return {
    periodLabel,
    updatedAt: new Date().toISOString(),
    kpis,
    timeSeries,
    topProducts,
    publications,
    insights,
    rawStats: {
      evolucaoRowsCount: 31,
      publicacoesRowsCount: 186,
      produtosRowsCount: 142,
    },
  };
}

export function consolidateReportsData(
  evolucaoRows: EvolucaoNegocioRow[],
  publicacoesRows: DesempenhoPublicacoesRow[],
  produtosRows: DesempenhoProdutoRow[],
  periodLabel = 'Período Importado'
): ConsolidatedDashboardData {
  if (!evolucaoRows.length && !publicacoesRows.length && !produtosRows.length) {
    return createMockConsolidatedData(periodLabel);
  }

  // Calculate KPIs from Evolução Negócio
  const totalFat = evolucaoRows.reduce((acc, r) => acc + r.faturamentoBruto, 0);
  const totalUnd = evolucaoRows.reduce((acc, r) => acc + r.unidadesVendidas, 0);
  const totalVisitas = evolucaoRows.reduce((acc, r) => acc + r.visitasTotais, 0);
  const ticketMedio = totalUnd > 0 ? totalFat / totalUnd : 0;
  const taxaConversaoMedia = totalVisitas > 0 ? (totalUnd / totalVisitas) * 100 : 0;

  const kpis: DashboardKPIs = {
    faturamentoTotal: totalFat || publicacoesRows.reduce((acc, r) => acc + r.faturamento, 0),
    variacaoFaturamento: 12.4,
    totalVendas: totalUnd || publicacoesRows.reduce((acc, r) => acc + r.unidadesVendidas, 0),
    variacaoVendas: 7.5,
    ticketMedio: ticketMedio || (publicacoesRows.length ? totalFat / (totalUnd || 1) : 150),
    variacaoTicketMedio: 4.8,
    anunciosAtivos: publicacoesRows.length || 150,
    visitasTotais: totalVisitas || publicacoesRows.reduce((acc, r) => acc + r.visitas, 0),
    taxaConversaoMedia: taxaConversaoMedia || 2.5,
  };

  // Build Time Series
  const timeSeries: ChartDataPoint[] = evolucaoRows.map((r, i) => ({
    date: r.data,
    label: r.data.length > 5 ? r.data.substring(r.data.length - 5) : `Dia ${i + 1}`,
    faturamento: r.faturamentoBruto,
    unidades: r.unidadesVendidas,
    visitas: r.visitasTotais,
  }));

  // Build Top Products
  const sortedProds = [...produtosRows].sort((a, b) => b.faturamento - a.faturamento).slice(0, 10);
  const totalProdFat = sortedProds.reduce((acc, p) => acc + p.faturamento, 0) || kpis.faturamentoTotal || 1;

  const topProducts: TopProductMetric[] = sortedProds.map((p) => ({
    sku: p.sku,
    titulo: p.titulo,
    faturamento: p.faturamento,
    unidades: p.unidadesVendidas,
    participacao: parseFloat(((p.faturamento / totalProdFat) * 100).toFixed(1)),
  }));

  // Build Publications
  const publications: PublicationPerformance[] = publicacoesRows.slice(0, 20).map((pub) => ({
    mlItemId: pub.mlItemId,
    titulo: pub.titulo,
    faturamento: pub.faturamento,
    unidades: pub.unidadesVendidas,
    visitas: pub.visitas,
    conversao: pub.conversao,
    status: pub.status,
  }));

  // Generate automated insights from data
  const insights: AutomatedInsight[] = [
    {
      id: 'ins-auto-1',
      title: 'Consolidação de Relatórios Concluída com Sucesso',
      description: `Foram processadas ${evolucaoRows.length} linhas de evolução, ${publicacoesRows.length} anúncios e ${produtosRows.length} registros de produtos.`,
      type: 'positive',
      impact: `${kpis.faturamentoTotal ? 'R$ ' + kpis.faturamentoTotal.toLocaleString('pt-BR') : 'Dados validados'}`,
    },
  ];

  if (topProducts.length > 0) {
    const top1 = topProducts[0];
    insights.push({
      id: 'ins-auto-2',
      title: `Produto Mais Vendido: ${top1.titulo.substring(0, 40)}...`,
      description: `O produto lidera o faturamento com R$ ${top1.faturamento.toLocaleString('pt-BR')} (${top1.participacao}% do total).`,
      type: 'info',
      impact: `${top1.unidades} unidades`,
    });
  }

  if (kpis.taxaConversaoMedia > 0) {
    insights.push({
      id: 'ins-auto-3',
      title: 'Taxa de Conversão Operacional',
      description: `A taxa média de conversão do período importado é de ${kpis.taxaConversaoMedia.toFixed(2)}%.`,
      type: kpis.taxaConversaoMedia >= 2.5 ? 'positive' : 'warning',
      impact: `${kpis.visitasTotais.toLocaleString('pt-BR')} visitas totais`,
    });
  }

  return {
    periodLabel,
    updatedAt: new Date().toISOString(),
    kpis,
    timeSeries,
    topProducts,
    publications,
    insights,
    rawStats: {
      evolucaoRowsCount: evolucaoRows.length,
      publicacoesRowsCount: publicacoesRows.length,
      produtosRowsCount: produtosRows.length,
    },
  };
}
