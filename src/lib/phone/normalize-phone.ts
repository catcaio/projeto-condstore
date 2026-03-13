import crypto from 'node:crypto';

function stripChannelPrefix(value: string): string {
    return value.trim().toLowerCase().replace(/^whatsapp:/, '');
}

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

export function normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;

    const cleaned = stripChannelPrefix(phone);
    const digits = digitsOnly(cleaned);

    if (!digits) return null;

    if (cleaned.startsWith('+')) {
        const explicitE164 = `+${digits}`;
        return isValidE164(explicitE164) ? explicitE164 : null;
    }

    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }

    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
        return `+${digits}`;
    }

    if (digits.startsWith('00')) {
        const international = `+${digits.slice(2)}`;
        return isValidE164(international) ? international : null;
    }

    if (digits.length >= 11 && digits.length <= 15) {
        return `+${digits}`;
    }

    return null;
}

export function isValidE164(phone: string | null | undefined): boolean {
    if (!phone) return false;
    return /^\+[1-9]\d{7,14}$/.test(phone.trim());
}

export function hashPhone(phone: string): string {
    return crypto.createHash('sha256').update(phone.trim()).digest('hex');
}

export function toWhatsAppPhone(phone: string | null | undefined): string | null {
    const e164 = phone && isValidE164(phone) ? phone.trim() : normalizePhone(phone);
    if (!e164) return null;
    return `whatsapp:${e164}`;
}

export function normalizePhoneNumber(raw: string | null | undefined): string {
    return toWhatsAppPhone(raw) ?? '';
}

