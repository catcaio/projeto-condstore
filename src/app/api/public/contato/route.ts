import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contatoSchema = z.object({
    nome: z
        .string()
        .min(2, 'Informe seu nome completo.')
        .max(100),
    empresa: z
        .string()
        .min(2, 'Informe o nome da empresa.')
        .max(100),
    cargo: z
        .string()
        .min(2, 'Informe seu cargo ou contexto operacional.')
        .max(100),
    canal: z.enum(['whatsapp', 'email', 'videochamada'], {
        error: 'Selecione um canal de contato.',
    }),
    operacao: z.enum(['frete', 'atendimento', 'pedidos', 'logistica', 'outro'], {
        error: 'Selecione o foco principal da operação.',
    }),
    mensagem: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = contatoSchema.parse(body);

        // Log de forma segura — sem dados sensíveis completos em produção
        const logPayload = {
            empresa: data.empresa,
            canal: data.canal,
            operacao: data.operacao,
            ts: new Date().toISOString(),
        };
        console.info('[contato] Nova solicitação de contato', logPayload);

        // TODO: Integrar com serviço de e-mail (ex: Resend) para notificar o time
        // await sendContactNotification(data);

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { ok: false, errors: err.flatten().fieldErrors },
                { status: 422 },
            );
        }

        console.error('[contato] Erro interno ao processar contato:', err);
        return NextResponse.json(
            { ok: false, message: 'Erro interno. Tente novamente.' },
            { status: 500 },
        );
    }
}
