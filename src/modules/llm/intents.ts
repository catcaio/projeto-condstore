
export enum IntentType {
    GREETING = 'greeting',
    FREIGHT_QUOTE = 'freight_quote',
    PRODUCT_INFO = 'product_info',
    ORDER_STATUS = 'order_status',
    HUMAN_HANDOFF = 'human_handoff',
    FALLBACK_HUMAN = 'fallback_human',
    UNKNOWN = 'unknown',
}

export enum ActionType {
    FREIGHT_QUOTE = 'freight_quote',
    PRODUCT_INFO = 'product_info',
    HUMAN_HANDOFF = 'human_handoff',
    FALLBACK = 'fallback',
}

export const BASELINE_KEYWORDS: Record<IntentType, string[]> = {
    [IntentType.GREETING]: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'ei'],
    [IntentType.FREIGHT_QUOTE]: ['frete', 'entrega', 'calcular', 'preço', 'envio', 'custo', 'cotar', 'cotação'],
    [IntentType.PRODUCT_INFO]: ['produto', 'info', 'detalhes', 'características', 'especificações', 'catalogo'],
    [IntentType.ORDER_STATUS]: ['pedido', 'rastreio', 'onde está', 'chega quando', 'status', 'acompanhar'],
    [IntentType.HUMAN_HANDOFF]: ['atendente', 'humano', 'pessoa', 'falar com gente', 'suporte'],
    [IntentType.FALLBACK_HUMAN]: [], // System only
    [IntentType.UNKNOWN]: [],
};
