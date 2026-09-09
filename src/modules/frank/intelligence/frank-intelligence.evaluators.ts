/**
 * FRK-8/008 — Deterministic suggestion evaluators (queue / active context /
 * pulse). Pure functions of tenant-scoped signals; every suggestion carries
 * an explicit `reason`. Deliberately NO LLM here (model decision: deterministic
 * rules first; probabilistic enrichment comes later, asynchronously).
 */
import type { FrankSuggestionInput } from './frank-intelligence.types';
import type { IntelligenceContext, SuggestionEvaluator } from './frank-intelligence.service';

// ─── Shared signal helpers ──────────────────────────────────────────────────

interface QueueThreadSignal {
  threadId: string;
  /** 0..1 — 1 = parada há muito tempo. */
  idleFactor?: number;
  /** 0..1 — 1 = SLA prestes a estourar. */
  slaRisk?: number;
  /** 0..1 — 1 = alto impacto financeiro. */
  financialImpact?: number;
  /** 0..1 — 1 = tipo/estado de alta prioridade. */
  typeWeight?: number;
  stateWeight?: number;
  historicalSignal?: number;
  lastActivityDays?: number;
}

function clamp01(v: number | undefined, fallback = 0): number {
  if (v === undefined || !Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

function queueSuggestion(thread: QueueThreadSignal, surface: 'queue'): FrankSuggestionInput | null {
  const idle = clamp01(thread.idleFactor);
  const sla = clamp01(thread.slaRisk);
  const financial = clamp01(thread.financialImpact);
  const priority =
    idle * 0.35 + sla * 0.3 + financial * 0.2 + clamp01(thread.typeWeight) * 0.1 + clamp01(thread.stateWeight) * 0.05;

  if (priority < 0.55) return null;

  const reasons: string[] = [];
  if (idle > 0.6) reasons.push(`thread parada há ~${thread.lastActivityDays ?? 3} dias`);
  if (sla > 0.6) reasons.push('SLA próximo do limite');
  if (financial > 0.6) reasons.push('impacto financeiro alto');
  if (reasons.length === 0) reasons.push(`prioridade calculada em ${Math.round(priority * 100)}/100`);

  return {
    surface,
    type: 'action',
    title: `Priorizar thread ${thread.threadId}`,
    description: 'Thread acima do limiar de prioridade para a fila de trabalho.',
    reason: reasons,
    confidence: Math.min(0.98, Math.round((0.5 + priority * 0.5) * 100) / 100),
    action: {
      label: 'Abrir thread',
      endpoint: `/api/cockpit/threads/${thread.threadId}`,
      method: 'GET',
    },
  };
}

function contextSuggestion(signal: Record<string, unknown>, surface: 'active_context'): FrankSuggestionInput | null {
  const idleDays = typeof signal.idleDays === 'number' ? signal.idleDays : 0;
  const quoteValue = typeof signal.quoteValue === 'number' ? signal.quoteValue : 0;
  const threadId = typeof signal.threadId === 'string' ? signal.threadId : 'unknown';

  if (idleDays >= 3) {
    return {
      surface,
      type: 'action',
      title: 'Enviar lembrete de cotação',
      description: `Cotação parada há ${idleDays} dia(s) sem resposta do cliente.`,
      reason: [`${idleDays} dias sem resposta`, quoteValue > 0 ? `valor de cotação R$ ${quoteValue}` : 'sem valor informado'],
      confidence: idleDays >= 5 ? 0.92 : 0.85,
      action: {
        label: 'Enviar lembrete',
        endpoint: `/api/cockpit/threads/${threadId}/reminder`,
        method: 'POST',
        payload: { threadId, kind: 'quote_reminder' },
      },
    };
  }
  return null;
}

function pulseSuggestion(signal: Record<string, unknown>, surface: 'pulse'): FrankSuggestionInput | null {
  const kind = typeof signal.kind === 'string' ? signal.kind : '';
  const entity = typeof signal.entity === 'string' ? signal.entity : '';

  const map = {
    payment_pending: { title: 'Pagamento pendente', desc: 'Existe pagamento pendente exigindo acompanhamento do operador.', endpoint: '/api/finance/payments', label: 'Acompanhar pagamento' },
    shipment_delayed: { title: 'Shipment atrasado', desc: 'Shipment com atraso identificado na rota.', endpoint: '/api/logistics/shipments', label: 'Acionar transportadora' },
    conversation_unanswered: { title: 'Conversa sem resposta', desc: 'Conversa de cliente sem resposta há tempo relevante.', endpoint: '/api/cockpit/threads', label: 'Ver conversa' },
    quote_expiring: { title: 'Cotação prestes a expirar', desc: 'Cotação com expiração próxima.', endpoint: '/api/cockpit/quotes', label: 'Revisar cotação' },
  } as const;

  const entry = map[kind as keyof typeof map];
  if (!entry) return null;

  return {
    surface,
    type: 'action',
    title: entry.title,
    description: `${entry.desc}${entity ? ` (${entity})` : ''}`,
    reason: [`alerta de exceção: ${kind}`, entity ? `entidade: ${entity}` : 'sem entidade específica'],
    confidence: 0.8,
    action: { label: entry.label, endpoint: entry.endpoint, method: 'GET' },
  };
}

// ─── Evaluators (exported, ready to plug into the service) ──────────────────

export const queueEvaluator: SuggestionEvaluator = async (context: IntelligenceContext) => {
  const threads = Array.isArray(context.signals.threads) ? (context.signals.threads as QueueThreadSignal[]) : [];
  const out: FrankSuggestionInput[] = [];
  for (const thread of threads) {
    const s = queueSuggestion(thread, 'queue');
    if (s) out.push(s);
  }
  return out;
};

export const activeContextEvaluator: SuggestionEvaluator = async (context: IntelligenceContext) => {
  const current = (context.signals.current as Record<string, unknown>) ?? {};
  const s = contextSuggestion(current, 'active_context');
  return s ? [s] : [];
};

export const pulseEvaluator: SuggestionEvaluator = async (context: IntelligenceContext) => {
  const events = Array.isArray(context.signals.events) ? (context.signals.events as Record<string, unknown>[]) : [];
  const out: FrankSuggestionInput[] = [];
  for (const ev of events) {
    const s = pulseSuggestion(ev, 'pulse');
    if (s) out.push(s);
  }
  return out;
};

export const ALL_EVALUATORS: SuggestionEvaluator[] = [queueEvaluator, activeContextEvaluator, pulseEvaluator];