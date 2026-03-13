/**
 * Frank Intent Resolver.
 *
 * Resolves the user's intent from a WhatsApp message
 * using keyword matching with confidence scoring.
 *
 * Also provides contextual resolution for follow-up messages
 * using session anchors from previous conversation turns.
 */

export type Intent =
    | 'GENERIC_QUESTION'
    | 'PRODUCT_QUERY'
    | 'FREIGHT'
    | 'FRETE'
    | 'PRODUTO'
    | 'PEDIDO'
    | 'ORDER_STATUS'
    | 'SHIPMENT_STATUS'
    | 'RECENT_ORDERS'
    | 'RECENT_QUOTES'
    | 'CUSTOMER_CONTEXT'
    | 'CONFIRM_QUOTE'
    | 'CONFIRM_ORDER'
    | 'PAYMENT'
    | 'REQUEST_INVOICE'
    | 'REQUEST_BOLETO'
    | 'COMPLAINT'
    | 'PRICE_NEGOTIATION'
    | 'SAUDACAO'
    | 'OUTRO';

export interface IntentResult {
    intent: Intent;
    confidence: number; // 0..1
    intentCandidates?: string[];
}

const FRETE_KEYWORDS = [
    'frete', 'cep', 'quanto fica', 'entrega', 'prazo', 'envio',
    'quanto custa', 'valor do frete', 'calcular frete', 'frete para',
    'quanto sai', 'prazo de entrega', 'calcula', 'simular',
];

const PRODUTO_KEYWORDS = [
    'produto', 'preço', 'valor', 'disponível', 'estoque',
    'tamanho', 'cor', 'modelo', 'qual o preço',
];

const ORDER_STATUS_KEYWORDS = [
    'qual o status do meu pedido', 'status do meu pedido', 'status do pedido',
    'meu pedido saiu', 'pedido saiu', 'andamento do pedido',
    'onde está meu pedido', 'onde esta meu pedido', 'pedido foi enviado',
];

const SHIPMENT_STATUS_KEYWORDS = [
    'tem rastreio', 'qual o rastreio', 'código de rastreio',
    'codigo de rastreio', 'rastreamento', 'rastreio', 'tracking',
    'saiu para entrega', 'pedido saiu para entrega',
];

const RECENT_ORDERS_KEYWORDS = [
    'qual meu último pedido', 'qual meu ultimo pedido', 'meu último pedido',
    'meu ultimo pedido', 'último pedido', 'ultimo pedido',
    'últimos pedidos', 'ultimos pedidos', 'pedidos recentes',
];

const RECENT_QUOTES_KEYWORDS = [
    'qual foi minha última cotação', 'qual foi minha ultima cotacao',
    'última cotação', 'ultima cotacao', 'últimas cotações',
    'ultimas cotacoes', 'cotações recentes', 'cotacoes recentes',
    'última simulação', 'ultima simulacao',
];

const CUSTOMER_CONTEXT_KEYWORDS = [
    'meu cadastro', 'dados do cliente', 'dados da minha conta',
    'contexto do cliente', 'meus contatos', 'minha empresa',
];

const PEDIDO_KEYWORDS = [
    'pedido', 'meu pedido', 'encomenda', 'compra',
];

const CONFIRM_QUOTE_KEYWORDS = [
    'pode fechar', 'confirmar pedido', 'pode enviar',
    'quero esse frete', 'pode prosseguir', 'fechar pedido',
    'esse mesmo', 'pode despachar',
];

const SAUDACAO_KEYWORDS = [
    'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello',
    'hi', 'eae', 'opa', 'tudo bem',
];

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .trim();
}

function countMatches(text: string, keywords: string[]): number {
    const normalized = normalize(text);
    let count = 0;
    for (const kw of keywords) {
        if (normalized.includes(normalize(kw))) {
            count++;
        }
    }
    return count;
}

/**
 * Patterns that represent ambiguous informational queries.
 * These should be classified as GENERIC_QUESTION by resolveIntent()
 * because they lack the specificity to route directly to a tool.
 * resolveContextualIntent() can promote them when session anchors exist.
 */
const GENERIC_INFORMATIONAL_PATTERNS = [
    'status do meu pedido',
    'qual o status',
    'tem rastreio',
    'ver meu cadastro',
    'meu cadastro',
    'quero ver meu',
    'dados da minha conta',
];

export function resolveIntent(message: string): IntentResult {
    if (!message || message.trim().length === 0) {
        return { intent: 'OUTRO', confidence: 0 };
    }

    const normalizedMessage = normalize(message);

    // Early rule: detect generic informational questions before specific classifiers.
    // These phrases are too ambiguous on their own to safely route to a tool
    // without session context backing them.
    if (GENERIC_INFORMATIONAL_PATTERNS.some(p => normalizedMessage.includes(normalize(p)))) {
        return { intent: 'GENERIC_QUESTION', confidence: 0.6 };
    }

    const scores: { intent: Intent; matches: number; total: number; priority: number }[] = [
        { intent: 'ORDER_STATUS', matches: countMatches(message, ORDER_STATUS_KEYWORDS), total: ORDER_STATUS_KEYWORDS.length, priority: 0 },
        { intent: 'SHIPMENT_STATUS', matches: countMatches(message, SHIPMENT_STATUS_KEYWORDS), total: SHIPMENT_STATUS_KEYWORDS.length, priority: 1 },
        { intent: 'RECENT_ORDERS', matches: countMatches(message, RECENT_ORDERS_KEYWORDS), total: RECENT_ORDERS_KEYWORDS.length, priority: 2 },
        { intent: 'RECENT_QUOTES', matches: countMatches(message, RECENT_QUOTES_KEYWORDS), total: RECENT_QUOTES_KEYWORDS.length, priority: 3 },
        { intent: 'CUSTOMER_CONTEXT', matches: countMatches(message, CUSTOMER_CONTEXT_KEYWORDS), total: CUSTOMER_CONTEXT_KEYWORDS.length, priority: 4 },
        { intent: 'FRETE', matches: countMatches(message, FRETE_KEYWORDS), total: FRETE_KEYWORDS.length, priority: 5 },
        { intent: 'PRODUTO', matches: countMatches(message, PRODUTO_KEYWORDS), total: PRODUTO_KEYWORDS.length, priority: 6 },
        { intent: 'PEDIDO', matches: countMatches(message, PEDIDO_KEYWORDS), total: PEDIDO_KEYWORDS.length, priority: 7 },
        { intent: 'CONFIRM_QUOTE', matches: countMatches(message, CONFIRM_QUOTE_KEYWORDS), total: CONFIRM_QUOTE_KEYWORDS.length, priority: 8 },
        { intent: 'SAUDACAO', matches: countMatches(message, SAUDACAO_KEYWORDS), total: SAUDACAO_KEYWORDS.length, priority: 9 },
    ];

    scores.sort((a, b) => {
        if (b.matches !== a.matches) {
            return b.matches - a.matches;
        }

        return a.priority - b.priority;
    });

    const best = scores[0];
    if (best.matches === 0) {
        return { intent: 'OUTRO', confidence: 0.1 };
    }

    // Confidence = matches / max possible, capped at 0.95
    let confidence = Math.min(best.matches / Math.min(best.total, 4), 0.95);
    confidence = Math.round(confidence * 100) / 100;

    const candidates = scores.filter(s => s.matches > 0).map(s => s.intent);

    if (confidence < 0.65) {
        return { intent: 'GENERIC_QUESTION', confidence: 0, intentCandidates: candidates };
    }

    return { intent: best.intent, confidence, intentCandidates: candidates };
}


// ─── Contextual Intent Resolution ───────────────────────────────────────────

/**
 * Session anchors extracted from frank_session_state for contextual resolution.
 */
export interface SessionAnchors {
    lastReferencedOrderId: string | null;
    lastReferencedShipmentId: string | null;
    lastReferencedQuoteId: string | null;
    lastReferencedCustomerId: string | null;
    previousIntent: Intent | null;
    lastToolUsed: string | null;
}

/**
 * Short follow-up phrases that are too ambiguous on their own
 * but become meaningful in context of a previous entity anchor.
 */
const FOLLOWUP_PHRASES = [
    'e agora', 'e o frete', 'tem previsao', 'tem previsão',
    'ja saiu', 'já saiu', 'tem rastreio', 'quando chega',
    'e o prazo', 'e o envio', 'e a entrega', 'quanto tempo',
    'chegou', 'saiu', 'e o status', 'como ta', 'como tá',
    'como esta', 'como está', 'e ai', 'e aí',
];

/**
 * Detect if a normalized message matches a follow-up phrase pattern.
 */
function isFollowUpPhrase(normalizedMessage: string): boolean {
    return FOLLOWUP_PHRASES.some((phrase) => normalizedMessage.includes(normalize(phrase)));
}

/**
 * Contextual follow-up mapping rules.
 * Maps (previousIntent, available anchor) → reclassified intent.
 */
function resolveFollowUpIntent(anchors: SessionAnchors): Intent | null {
    const prevIntent = anchors.previousIntent;

    // After ORDER_STATUS → follow-up likely wants SHIPMENT_STATUS
    if (prevIntent === 'ORDER_STATUS' && anchors.lastReferencedOrderId) {
        return 'SHIPMENT_STATUS';
    }

    // After PEDIDO → follow-up likely wants SHIPMENT_STATUS
    if (prevIntent === 'PEDIDO' && anchors.lastReferencedOrderId) {
        return 'SHIPMENT_STATUS';
    }

    // After SHIPMENT_STATUS → reiterate (check again)
    if (prevIntent === 'SHIPMENT_STATUS' && (anchors.lastReferencedShipmentId || anchors.lastReferencedOrderId)) {
        return 'SHIPMENT_STATUS';
    }

    // After RECENT_ORDERS → follow-up about latest order
    if (prevIntent === 'RECENT_ORDERS' && anchors.lastReferencedOrderId) {
        return 'ORDER_STATUS';
    }

    // After RECENT_QUOTES → follow-up about latest quote
    if (prevIntent === 'RECENT_QUOTES' && anchors.lastReferencedQuoteId) {
        return 'RECENT_QUOTES';
    }

    // After CUSTOMER_CONTEXT → follow-up about orders
    if (prevIntent === 'CUSTOMER_CONTEXT' && anchors.lastReferencedCustomerId) {
        return 'RECENT_ORDERS';
    }

    return null;
}

/** Confidence assigned to contextually-inferred intents. */
const CONTEXTUAL_CONFIDENCE = 0.70;

/**
 * Resolve intent considering conversational context.
 *
 * 1. Run standard keyword-based resolveIntent().
 * 2. If keyword returns a specific (non-GENERIC_QUESTION, non-OUTRO) intent
 *    with adequate confidence, return as-is.
 * 3. If the result is GENERIC_QUESTION or low confidence, check session anchors:
 *    - If anchors exist and message matches a follow-up phrase → reclassify.
 *    - Otherwise return the standard result for safe fallback.
 */
export function resolveContextualIntent(
    message: string,
    anchors: SessionAnchors | null,
): IntentResult {
    const standardResult = resolveIntent(message);

    // High-confidence specific intent (not GENERIC_QUESTION / OUTRO) — trust it directly
    if (standardResult.intent !== 'OUTRO' && standardResult.intent !== 'GENERIC_QUESTION' && standardResult.confidence >= 0.25) {
        return standardResult;
    }

    // No anchors — cannot infer context, return standard result for fallback
    if (!anchors) {
        return standardResult;
    }

    // Check if this looks like a follow-up phrase
    const normalizedMsg = normalize(message);
    if (!isFollowUpPhrase(normalizedMsg)) {
        return standardResult;
    }

    // Attempt contextual reclassification
    const contextualIntent = resolveFollowUpIntent(anchors);
    if (contextualIntent) {
        return {
            intent: contextualIntent,
            confidence: CONTEXTUAL_CONFIDENCE,
        };
    }

    // No applicable rule — return standard result for safe fallback
    return standardResult;
}

