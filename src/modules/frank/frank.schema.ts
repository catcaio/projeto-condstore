import { z } from 'zod';

export const SuggestedActionEnum = z.enum([
    'ANSWER_ONLY',
    'FOLLOW_UP_TASK',
    'CREATE_QUOTE_DRAFT',
    'MARK_AS_WAITING',
    'REQUEST_OPERATOR_REVIEW',
    'NONE'
]);

export type SuggestedActionType = z.infer<typeof SuggestedActionEnum>;

export const FrankDraftSchema = z.object({
    summary: z.string().describe("Um resumo executivo sobre em que ponto a negociação/conversa está baseando-se nas últimas interações."),
    suggestedReplyDraft: z.string().nullable().describe("Um rascunho em tom comercial para ser enviado ao cliente. Null se a conversa puder ser apenas encerrada ou o cliente não precisar de resposta imediata."),
    suggestedAction: SuggestedActionEnum.describe("A ação tática ou de sistema principal que o atendente deve executar agora."),
    actionPayload: z.record(z.string(), z.any()).nullable().describe("Carga de dados estruturada caso a action precise de inputs iniciais (ex: titulo da task, itens da quote)."),
    insights: z.array(z.string()).describe("Lista de observações comerciais relevantes extraídas do CRM (ex: ticket médio do cliente, produtos recorrentes, observações não visíveis na conversa em si)."),
    warnings: z.array(z.string()).describe("Lista de alertas vermelhos (ex: cliente irado, quote vencendo, task atrasada). Vazio caso não haja atritos."),
    confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe("Grau de certeza da IA sobre o rascunho oferecido.")
});

export type FrankOperationalDraft = z.infer<typeof FrankDraftSchema>;
