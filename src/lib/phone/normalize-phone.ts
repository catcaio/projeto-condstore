import { normalizePhone } from '@/lib/phone';

export function normalizeWhatsAppPhone(rawPhone: string | null | undefined): string {
    return normalizePhone(rawPhone);
}
