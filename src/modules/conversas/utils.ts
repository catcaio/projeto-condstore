/**
 * Utility functions for Inbox Queue Mode.
 * Ensures deterministic grouping, PII masking and deterministic state machine.
 */

// 1. CHAVE DE AGRUPAMENTO SEM COLISÃO
export function buildConversationKey({
    tenantId,
    phoneRaw,
    refToken
}: {
    tenantId: string;
    phoneRaw?: string | null;
    refToken?: string | null;
}) {
    if (!tenantId) throw new Error("tenantId is required for conversation key");

    if (phoneRaw && phoneRaw.trim()) {
        // Normalização conservadora do phone, remove espaços, parênteses, traços
        let normalized = phoneRaw.trim().replace(/[\s\(\)\-]/g, '');
        const hasPlus = normalized.includes('+');
        normalized = normalized.replace(/[^\d]/g, ''); // só números
        if (hasPlus) normalized = '+' + normalized;

        return `${tenantId}:${normalized}`;
    }

    if (refToken && refToken.trim()) {
        return `${tenantId}:ref:${refToken.trim()}`;
    }

    throw new Error("Cannot build conversation key without phone or refToken");
}

// 2. PII SAFE MASKING
export function maskPhone(phone?: string | null): string | undefined {
    if (!phone) return undefined;
    let clean = phone.trim().replace(/[\s\(\)\-]/g, '');
    const hasWhatsApp = clean.toLowerCase().startsWith('whatsapp:');
    if (hasWhatsApp) clean = clean.substring(9);
    
    // ex: +5511999991234 -> +55******1234
    if (clean.length <= 6) return clean.substring(0, 2) + '*'.repeat(Math.max(1, clean.length - 2));
    
    const hasPlus = clean.startsWith('+');
    const startOffset = hasPlus ? 3 : 2; // +55 or 55
    const start = clean.substring(0, startOffset); 
    const end = clean.substring(clean.length - 4);
    const maskedLen = clean.length - start.length - end.length;
    
    return start + '*'.repeat(Math.max(1, maskedLen)) + end;
}

export function maskRefToken(token?: string | null): string | undefined {
    if (!token) return undefined;
    const t = token.trim();
    if (t.length <= 6) return '***';
    return t.substring(0, 3) + '...' + t.substring(t.length - 3);
}

// 3. DETERMINISTIC STATE MACHINE
/**
 * OPEN: Recebeu mensagem/atividade INBOUND recente e NÃO foi respondido ativamente OUTBOUND, ou inbound é mais recente. E no max 7 dias.
 * PENDING: Enviamos OUTBOUND mais recente que INBOUND. E no max 7 dias.
 * CLOSED: Última atividade maior que X dias (geralmente 7), independente da sequência.
 */
export type ConversationStatus = 'open' | 'pending' | 'closed';

export function deriveConversationStatus(
    lastActivityAt: Date,
    lastInboundAt?: Date,
    lastOutboundAt?: Date,
    limitDays: number = 7
): { status: ConversationStatus; slaMinutes?: number } {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - limitDays * 24 * 60 * 60 * 1000);

    if (lastActivityAt < daysAgo) {
        return { status: 'closed' };
    }

    if (lastInboundAt && (!lastOutboundAt || lastInboundAt > lastOutboundAt)) {
        const slaMinutes = Math.floor((now.getTime() - lastInboundAt.getTime()) / 60000);
        return { status: 'open', slaMinutes };
    } else if (lastOutboundAt && (!lastInboundAt || lastOutboundAt > lastInboundAt)) {
        return { status: 'pending' };
    }

    // Default active but no inbound/outbound established? Fallback to open
    return { status: 'open' };
}
