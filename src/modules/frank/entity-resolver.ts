/**
 * Frank Entity Resolver.
 *
 * Extracts structured entities from WhatsApp customer messages
 * using regex-based pattern matching against the Lojacond product domain.
 *
 * Runs before tool execution to enrich the session context.
 * No I/O dependencies — pure text processing.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExtractedEntities {
    product: string | null;
    quantity: number | null;
    volume: number | null;
    orderId: string | null;
    documentType: 'boleto' | 'nota' | null;
}

export interface EntityResolutionResult {
    entities: ExtractedEntities;
    confidence: number; // 0..1
    raw: string;
}

// ─── Normalizer ─────────────────────────────────────────────────────────────

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// ─── Extractors ─────────────────────────────────────────────────────────────

/**
 * Extract order ID from patterns like "pedido 25860", "pedido #25860", "pedido nº 25860".
 * Supports numeric IDs (4-6 digits) and UUID-like IDs.
 */
function extractOrderId(text: string): string | null {
    const normalized = normalize(text);

    // UUID pattern
    const uuidMatch = text.match(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    );
    if (uuidMatch) return uuidMatch[0];

    // Numeric order ID: "pedido 25860", "pedido #25860", "pedido nº 25860"
    const orderMatch = normalized.match(
        /pedido\s*(?:#|n[º°]?\s*)?\s*(\d{4,6})\b/,
    );
    if (orderMatch) return orderMatch[1];

    return null;
}

/**
 * Extract document type: boleto or nota fiscal.
 */
function extractDocumentType(text: string): 'boleto' | 'nota' | null {
    const normalized = normalize(text);

    if (/boleto/.test(normalized)) return 'boleto';
    if (/\b(nota\s*fiscal|nf-?e?|nota)\b/.test(normalized)) return 'nota';

    return null;
}

/**
 * Extract volume/litragem from patterns like "240L", "240 litros", "240l".
 */
function extractVolume(text: string): number | null {
    const normalized = normalize(text);
    const match = normalized.match(/(\d+)\s*(?:l(?:itros?)?)\b/);
    if (match) return parseInt(match[1], 10);
    return null;
}

/**
 * Extract quantity from patterns like "3 carrinhos", "preciso de 5 lixeiras".
 */
function extractQuantity(text: string): number | null {
    const normalized = normalize(text);

    // "preciso de N ..."
    const preciso = normalized.match(/preciso\s+de\s+(\d+)\s+/);
    if (preciso) return parseInt(preciso[1], 10);

    // "N <substantivo>" — digit followed by a word (but not a volume like "240L")
    const leading = normalized.match(/\b(\d{1,3})\s+(?!l(?:itros?)?|r\$)([a-z])/);
    if (leading) {
        const num = parseInt(leading[1], 10);
        if (num > 0 && num <= 999) return num;
    }

    return null;
}

/**
 * Extract product reference from natural language.
 *
 * Patterns:
 * - "valor da lixeira 240L"
 * - "preço do carrinho de supermercado"
 * - "orçamento de 3 carrinhos"
 * - "cotação de container 1000L"
 */
function extractProduct(text: string): string | null {
    const normalized = normalize(text);

    // Pattern: "valor/preço/cotação/orçamento de/do/da/dos/das <product>"
    const valuePatterns = [
        /(?:valor|preco|cotacao|orcamento|preco)\s+(?:d[aoe]s?|de)\s+(.+?)(?:\?|$)/,
        /(?:quanto\s+(?:custa|fica|sai|e))\s+(?:(?:um|uma|o|a|os|as)\s+)?(.+?)(?:\?|$)/,
    ];

    for (const pattern of valuePatterns) {
        const match = normalized.match(pattern);
        if (match?.[1]) {
            const raw = match[1].trim();
            // Remove trailing punctuation and excess whitespace
            const cleaned = raw.replace(/[?.!,;]+$/, '').trim();
            if (cleaned.length > 1) return cleaned;
        }
    }

    // Pattern: "N <product>" (quantity prefix) — extract the product part
    const qtyPattern = normalized.match(
        /\b\d{1,3}\s+(.{3,})$/,
    );
    if (qtyPattern) {
        const raw = qtyPattern[1].replace(/[?.!,;]+$/, '').trim();
        if (raw.length > 2) return raw;
    }

    return null;
}

// ─── Main Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve entities from a customer message.
 *
 * Returns extracted entities plus a confidence score based on
 * how many entity types were successfully detected.
 */
export function resolveEntities(message: string): EntityResolutionResult {
    if (!message || message.trim().length === 0) {
        return {
            entities: { product: null, quantity: null, volume: null, orderId: null, documentType: null },
            confidence: 0,
            raw: message ?? '',
        };
    }

    const product = extractProduct(message);
    const quantity = extractQuantity(message);
    const volume = extractVolume(message);
    const orderId = extractOrderId(message);
    const documentType = extractDocumentType(message);

    const entities: ExtractedEntities = {
        product,
        quantity,
        volume,
        orderId,
        documentType,
    };

    // Confidence = proportion of non-null entities / total possible, capped at 0.95
    const fields = [product, quantity, volume, orderId, documentType];
    const detected = fields.filter((f) => f !== null).length;
    const confidence = detected === 0 ? 0 : Math.min(detected / 3, 0.95);

    return {
        entities,
        confidence: Math.round(confidence * 100) / 100,
        raw: message,
    };
}

/**
 * List entity type names that were detected (for observability, no PII).
 */
export function detectedEntityTypes(entities: ExtractedEntities): string[] {
    const types: string[] = [];
    if (entities.product !== null) types.push('product');
    if (entities.quantity !== null) types.push('quantity');
    if (entities.volume !== null) types.push('volume');
    if (entities.orderId !== null) types.push('orderId');
    if (entities.documentType !== null) types.push('documentType');
    return types;
}

/**
 * List entity type names that are missing (for observability).
 */
export function missingEntityTypes(
    entities: ExtractedEntities,
    expected: (keyof ExtractedEntities)[],
): string[] {
    return expected.filter((key) => entities[key] === null);
}
