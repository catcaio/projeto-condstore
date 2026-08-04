export type ReportType = 'EVOLUCAO_NEGOCIO' | 'DESEMPENHO_PUBLICACOES' | 'DESEMPENHO_PRODUTO' | 'DESCONHECIDO';

export interface FileUploadState {
  id: string;
  file: File | null;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  identifiedType: ReportType;
  errorMessage?: string;
}

export interface EvolucaoNegocioRow {
  data: string;
  faturamentoBruto: number;
  unidadesVendidas: number;
  pedidosTotal: number;
  ticketMedio: number;
  visitasTotais: number;
  taxaConversao: number;
  cancelamentos: number;
}

export interface DesempenhoPublicacoesRow {
  mlItemId: string;
  titulo: string;
  tipoAnuncio: string;
  status: string;
  preco: number;
  faturamento: number;
  unidadesVendidas: number;
  visitas: number;
  conversao: number;
  qualidadeAnuncio: number;
}

export interface DesempenhoProdutoRow {
  sku: string;
  titulo: string;
  categoria: string;
  unidadesVendidas: number;
  faturamento: number;
  estoqueDisponivel: number;
  participacaoFaturamento: number;
}

export interface DashboardKPIs {
  faturamentoTotal: number;
  variacaoFaturamento: number;
  totalVendas: number;
  variacaoVendas: number;
  ticketMedio: number;
  variacaoTicketMedio: number;
  anunciosAtivos: number;
  visitasTotais: number;
  taxaConversaoMedia: number;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  faturamento: number;
  unidades: number;
  visitas: number;
}

export interface TopProductMetric {
  sku: string;
  titulo: string;
  faturamento: number;
  unidades: number;
  participacao: number;
}

export interface PublicationPerformance {
  mlItemId: string;
  titulo: string;
  faturamento: number;
  unidades: number;
  visitas: number;
  conversao: number;
  status: string;
}

export interface AutomatedInsight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'opportunity' | 'info';
  impact: string;
}

export interface ConsolidatedDashboardData {
  periodLabel: string;
  updatedAt: string;
  kpis: DashboardKPIs;
  timeSeries: ChartDataPoint[];
  topProducts: TopProductMetric[];
  publications: PublicationPerformance[];
  insights: AutomatedInsight[];
  rawStats: {
    evolucaoRowsCount: number;
    publicacoesRowsCount: number;
    produtosRowsCount: number;
  };
}

export interface DashboardSnapshot {
  id: string;
  periodId: string; // e.g. '2026-07'
  periodLabel: string; // e.g. 'Julho 2026'
  importedAt: string;
  channel: string;
  data: ConsolidatedDashboardData;
}

export interface DashboardFilters {
  channel: string;
  periodId: string;
  statusFilter: string;
  searchQuery: string;
}
