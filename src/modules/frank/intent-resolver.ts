/**
 * Frank Intent Resolver.
 *
 * Resolves the user's intent from a WhatsApp message
 * using keyword matching with confidence scoring.
 */

export type Intent = 'FRETE' | 'PRODUTO' | 'PEDIDO' | 'SAUDACAO' | 'OUTRO';

export interface IntentResult {
    intent: Intent;
    confidence: number; // 0..1
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

const PEDIDO_KEYWORDS = [
    'pedido', 'rastreio', 'rastreamento', 'meu pedido', 'status',
    'encomenda', 'onde está', 'chegou', 'código de rastreio',
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

export function resolveIntent(message: string): IntentResult {
    if (!message || message.trim().length === 0) {
        return { intent: 'OUTRO', confidence: 0 };
    }

    const scores: { intent: Intent; matches: number; total: number }[] = [
        { intent: 'FRETE', matches: countMatches(message, FRETE_KEYWORDS), total: FRETE_KEYWORDS.length },
        { intent: 'PRODUTO', matches: countMatches(message, PRODUTO_KEYWORDS), total: PRODUTO_KEYWORDS.length },
        { intent: 'PEDIDO', matches: countMatches(message, PEDIDO_KEYWORDS), total: PEDIDO_KEYWORDS.length },
        { intent: 'SAUDACAO', matches: countMatches(message, SAUDACAO_KEYWORDS), total: SAUDACAO_KEYWORDS.length },
    ];

    // Sort by match count descending
    scores.sort((a, b) => b.matches - a.matches);

    const best = scores[0];
    if (best.matches === 0) {
        return { intent: 'OUTRO', confidence: 0.1 };
    }

    // Confidence = matches / max possible, capped at 0.95
    const confidence = Math.min(best.matches / Math.min(best.total, 4), 0.95);

    return { intent: best.intent, confidence: Math.round(confidence * 100) / 100 };
}
