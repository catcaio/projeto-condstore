import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimiter, applyRateLimitHeaders } from '@/infra/security/rate-limiter';
import { sha256Hex } from '@/infra/attribution/hash';
import { publicEventsRepository } from '@/infra/repositories/public-events.repository';

const contatoSchema = z.object({
    nome: z.string().min(2).max(100),
    empresa: z.string().min(2).max(100),
    cargo: z.string().min(2).max(100),
    canal: z.enum(['whatsapp', 'email', 'videochamada']),
    operacao: z.enum(['frete', 'atendimento', 'pedidos', 'logistica', 'outro']),
    mensagem: z.string().max(1000).optional(),
});

/** Sanitization: remove whitespace excessivo e tags HTML de campos de texto (LGPD) */
function sanitizeContactPayload(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object') return raw;
    const obj = raw as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = value.replace(/<[^>]*>/g, '').trim().slice(0, 1000);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

function getClientIp(req: NextRequest): string | null {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]?.trim() ?? null;
    return req.headers.get('x-real-ip');
}

export async function POST(req: NextRequest) {
    const rawIp = getClientIp(req);
    const ipHash = sha256Hex(rawIp) ?? 'ip_unknown';
    const rateLimitKey = `contato_form_ip:${ipHash}`;

    // Rate limit: 3 submissões por hora por IP (formulário de contato comercial)
    const rateDecision = await rateLimiter.limit('contato_form', rateLimitKey, {
        windowSec: 3600,
        max: 3,
    });

    if (!rateDecision.allowed) {
        return applyRateLimitHeaders(
            NextResponse.json(
                { ok: false, message: 'Muitas solicitações. Tente novamente mais tarde.' },
                { status: 429 },
            ),
            rateDecision,
        );
    }

    try {
        const rawBody = await req.json();

        // Sanitization de payload — remove HTML e espaços excessivos (LGPD)
        const sanitizedBody = sanitizeContactPayload(rawBody);

        const result = contatoSchema.safeParse(sanitizedBody);
        if (!result.success) {
            return applyRateLimitHeaders(
                NextResponse.json(
                    { ok: false, errors: result.error.flatten().fieldErrors },
                    { status: 422 },
                ),
                rateDecision,
            );
        }

        const data = result.data;

        // Log sem dados pessoais identificáveis
        console.info('[contato] Nova solicitação de contato', {
            empresa: data.empresa,
            canal: data.canal,
            operacao: data.operacao,
            ts: new Date().toISOString(),
        });

        // Registro no publicEventsRepository para rastreabilidade (LGPD + analytics)
        await publicEventsRepository.create({
            id: crypto.randomUUID(),
            tenantId: process.env.PUBLIC_TENANT_ID ?? 'condstore-public',
            anonId: ipHash,
            eventType: 'contact_form_submitted',
            payloadJson: { canal: data.canal, operacao: data.operacao },
            ipHash,
            uaHash: sha256Hex(req.headers.get('user-agent')) ?? 'ua_unknown',
        });

        // TODO: Integrar com serviço de e-mail (ex: Resend) para notificar o time
        // await sendContactNotification(data);

        return applyRateLimitHeaders(
            NextResponse.json({ ok: true }, { status: 200 }),
            rateDecision,
        );
    } catch (err) {
        console.error('[contato] Erro interno ao processar contato:', err);
        return applyRateLimitHeaders(
            NextResponse.json(
                { ok: false, message: 'Erro interno. Tente novamente.' },
                { status: 500 },
            ),
            rateDecision,
        );
    }
}
