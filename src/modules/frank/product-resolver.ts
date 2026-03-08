/**
 * Product Resolver.
 *
 * Extracts product reference from URLs or text patterns in WhatsApp messages.
 */

const PRODUCT_URL_REGEX = /lojacondstore\.com\.br\/produto\/([a-zA-Z0-9_-]+)/i;
const PRODUCT_URL_ALT_REGEX = /condstore\.com\.br\/produto\/([a-zA-Z0-9_-]+)/i;

/**
 * Extract productRef from a product URL in the message.
 * Returns the slug/SKU portion or null.
 */
export function resolveProductFromUrl(text: string): string | null {
    if (!text) return null;

    const match = text.match(PRODUCT_URL_REGEX) || text.match(PRODUCT_URL_ALT_REGEX);
    if (match && match[1]) {
        return match[1];
    }

    return null;
}
