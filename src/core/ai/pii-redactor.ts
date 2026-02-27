export class PIIRedactor {
    public sanitizeInput(text: string): string {
        if (!text) return text;

        let sanitized = text;

        // Emails
        // basic matching for example@domain.com
        sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

        // CPF/CNPJ
        // Match standard format 000.000.000-00 or 00.000.000/0000-00
        sanitized = sanitized.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED_CPF]');
        sanitized = sanitized.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[REDACTED_CNPJ]');

        // Also match raw CPF/CNPJ (11 or 14 digits straight) conditionally if we're aggressive, 
        // but for safety only strictly formatted ones to avoid blanking tracking numbers.

        // Credit Cards (13-19 digits usually, 16 most common) - mostly spaced or dashed
        sanitized = sanitized.replace(/(?:^|\s|\b)(?:\d{4}[ -]?){3}\d{4}(?:\s|\b|$)/g, ' [REDACTED_CARD] ');

        // Phones (Brazil roughly) (+55 11 98888-8888, 11 98888-8888, etc)
        sanitized = sanitized.replace(/(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})[-.\s]?(\d{4}))/g, '[REDACTED_PHONE]');

        return sanitized.trim();
    }
}

export const piiRedactor = new PIIRedactor();
