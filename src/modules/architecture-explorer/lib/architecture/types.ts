export const STATUSES = [
  "production",
  "partial",
  "implemented",
  "experimental",
  "planned",
  "out_of_scope",
  "unconfirmed",
] as const;

export type NodeStatus = (typeof STATUSES)[number];

export const KINDS = [
  "system",
  "domain",
  "module",
  "service",
  "component",
  "api",
  "page",
  "entity",
  "integration",
  "infra",
  "worker",
  "event",
  "tool",
  "security",
  "tech",
] as const;

export type NodeKind = (typeof KINDS)[number];

export const LAYERS = [
  "frontend",
  "backend",
  "database",
  "api",
  "integration",
  "infra",
  "ai",
  "security",
  "events",
  "tests",
  "product",
] as const;

export type Layer = (typeof LAYERS)[number];

export const VIEWS = [
  "architecture",
  "flow",
  "dependencies",
  "data",
  "integrations",
  "ai",
  "infra",
  "tenant",
  "stack",
] as const;

export type ViewId = (typeof VIEWS)[number];

export const EDGE_TYPES = [
  "contains",
  "calls",
  "persists",
  "integrates",
  "publishes",
  "depends",
  "flow",
  "isolates",
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export interface ArchNode {
  id: string;
  name: string;
  kind: NodeKind;
  domain: string;
  status: NodeStatus;
  path?: string;
  directory?: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  relatedFiles: string[];
  github?: string;
  evidence: string;
  technologies: string[];
  mvp: boolean;
  tags: string[];
  parentId: string | null;
  layer: Layer;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  description?: string;
}

export interface FlowStep {
  nodeId: string;
  label: string;
  detail: string;
}

export interface ArchFlow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  mvp: boolean;
}

export interface ArchMeta {
  product: string;
  repo: string;
  repoUrl: string;
  homepage: string;
  auditedAt: string;
  sourceOfTruth: string;
  stack: Record<string, string>;
  counts: Record<string, number>;
}

export const STATUS_LABEL: Record<NodeStatus, string> = {
  production: "Produção",
  partial: "Parcial",
  implemented: "Implementado",
  experimental: "Experimental",
  planned: "Planejado",
  out_of_scope: "Fora do escopo",
  unconfirmed: "Não confirmado",
};

export const KIND_LABEL: Record<NodeKind, string> = {
  system: "Sistema",
  domain: "Domínio",
  module: "Módulo",
  service: "Serviço",
  component: "Componente",
  api: "API",
  page: "Página",
  entity: "Entidade",
  integration: "Integração",
  infra: "Infra",
  worker: "Worker",
  event: "Evento",
  tool: "Ferramenta",
  security: "Segurança",
  tech: "Tecnologia",
};

export const LAYER_LABEL: Record<Layer, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  api: "API",
  integration: "Integração",
  infra: "Infraestrutura",
  ai: "IA",
  security: "Segurança",
  events: "Eventos",
  tests: "Testes",
  product: "Produto",
};

export const VIEW_LABEL: Record<ViewId, string> = {
  architecture: "Arquitetura",
  flow: "Fluxo",
  dependencies: "Dependências",
  data: "Dados",
  integrations: "Integrações",
  ai: "IA",
  infra: "Infra",
  tenant: "Multi-tenant",
  stack: "Stack",
};

export const DOMAIN_LABEL: Record<string, string> = {
  os: "CONDSTORE OS",
  product: "Produto",
  ops: "Domínio operacional",
  ai: "IA / Frank",
  data: "Dados",
  events: "Eventos",
  integrations: "Integrações",
  infra: "Infraestrutura",
  security: "Segurança",
  quality: "Qualidade",
  stack: "Stack",
};

export const GH_BASE = "https://github.com/catcaio/projeto-condstore/blob/main";

export function githubUrl(path?: string): string | undefined {
  if (!path) return undefined;
  return `${GH_BASE}/${path.replace(/^\//, "")}`;
}
