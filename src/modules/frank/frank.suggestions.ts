import { randomUUID } from 'crypto';
import { OpenAI } from 'openai';
import { sanitizeFrankPayload } from '@/core/ai/frank-event-sanitize';
import { logger } from '@/infra/logger';
import { frankEventsRepository } from '@/infra/repositories/frank-events.repository';
import { tokenUsageEventsRepository } from '@/infra/repositories/token-usage-events.repository';
import type { FrankContextPayload } from './frank.context-builder';
import {
    FrankDailyLimitExceededError,
    FrankMissingOpenAiApiKeyError,
    FrankTokenUsageLockTimeoutError,
} from './frank.errors';
import { FrankDraftSchema, FrankOperationalDraft } from './frank.schema';
import { frankTokenUsageService } from './services/token-usage.service';

const MODEL = 'gpt-4o-mini';
const CALL_SITE = 'frankSuggestions.generateSuggestions';

const SYSTEM_PROMPT = `
Você é Frank, o assistente inteligente de atendimento e vendas do CondStore OS.
Seu papel neste momento é atuar EXCLUSIVAMENTE como um Observador e Copiloto (Passivo).
Você não executa ações, não envia mensagens para clientes, não muda o estágio (stage) da negociação e não altera nenhum dado do banco.

Dada a conversa em andamento e o contexto do cliente fornecido no Payload, sua missão é preencher o schema estrito obedecendo às seguintes regras:
1. 'summary': Resuma rapidamente em que pé a conversa está.
2. 'suggestedReplyDraft': Escreva um rascunho de resposta adequado para o Operador Humano enviar ao cliente. Use tom prestativo e comercial. Se o cliente estiver aguardando alguma informação que o Operador precisa preencher, coloque [entre colchetes]. Se a última mensagem foi do operador e não precisa de resposta, retorne null.
3. 'suggestedAction': Determine o próximo passo lógico tático (FOLLOW_UP_TASK, CREATE_QUOTE_DRAFT, ANSWER_ONLY, etc).
4. 'actionPayload': Se a action demandar dados iniciais, preencha. Ex: se for FOLLOW_UP_TASK, preencha com { "title": "Ligar amanhã cedo" }. Se CREATE_QUOTE_DRAFT, preencha com itens ou preço.
5. 'insights': Forneça de 1 a 3 insights rápidos e valiosos lendo o CRM do cliente.
6. 'warnings': Alertas vermelhos caso quote estiver vencendo ou task atrasada.

Regras de Segurança Escritas em Pedra:
- ZERE suas invenções comerciais. Baseie-se APENAS no contexto JSON fornecido.
- NUNCA sugira descontos mirabolantes ou crie preços que não estão nas quotes recentes.
- Aja unicamente como copiloto assistente (Draft mode).
`;

function isDevelopmentRuntime(): boolean {
    return process.env.NODE_ENV === 'development';
}

function buildMissingIntegrationDraft(): FrankOperationalDraft {
    return {
        summary: 'O Assistente Frank está temporariamente desabilitado por falta de integração configurada.',
        suggestedReplyDraft: 'Não foi possível gerar dica automática.',
        suggestedAction: 'NONE',
        actionPayload: null,
        insights: ['Configure OPENAI_API_KEY nas variáveis de ambiente.'],
        warnings: [],
        confidence: 'LOW',
    };
}

function buildFallbackDraft(): FrankOperationalDraft {
    return {
        summary: 'Falha ao gerar análise estruturada pelo Frank AI.',
        suggestedReplyDraft: null,
        suggestedAction: 'NONE',
        actionPayload: null,
        insights: ['Tente novamente mais tarde. Erro interno no LLM.'],
        warnings: ['Falha de integração.'],
        confidence: 'LOW',
    };
}

function getOpenAiClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        throw new FrankMissingOpenAiApiKeyError();
    }

    return new OpenAI({ apiKey });
}

function isControlledFrankError(error: unknown): boolean {
    return error instanceof FrankDailyLimitExceededError
        || error instanceof FrankMissingOpenAiApiKeyError
        || error instanceof FrankTokenUsageLockTimeoutError;
}

export const frankSuggestions = {
    async generateSuggestions(tenantId: string, context: FrankContextPayload): Promise<FrankOperationalDraft> {
        if (!process.env.OPENAI_API_KEY?.trim()) {
            if (isDevelopmentRuntime()) {
                logger.warn('frank_openai_key_missing_dev', {
                    tenantId,
                    callSite: CALL_SITE,
                });
                return buildMissingIntegrationDraft();
            }

            throw new FrankMissingOpenAiApiKeyError();
        }

        const correlationId = randomUUID();
        const startedAt = Date.now();

        try {
            const trackedResponse = await frankTokenUsageService.executeTrackedCall({
                tenantId,
                model: MODEL,
                callSite: CALL_SITE,
                eventContext: {
                    customerId: context.customer?.id ?? null,
                    entityId: context.conversation.id,
                    sessionId: context.conversation.id,
                },
                execute: async () => {
                    const response = await getOpenAiClient().chat.completions.create({
                        model: MODEL,
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: `Contexto do Cliente e Conversa:\n${JSON.stringify(context, null, 2)}` },
                        ],
                        temperature: 0.2,
                        response_format: { type: 'json_object' },
                    });

                    return {
                        result: response,
                        usage: response.usage,
                    };
                },
            });

            const response = trackedResponse.result;
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty or invalid structured response from OpenAI');
            }

            const latencyMs = Date.now() - startedAt;
            const promptTokens = trackedResponse.usage.promptTokens;
            const completionTokens = trackedResponse.usage.completionTokens;

            const eventPayload = sanitizeFrankPayload({
                prompt: {
                    system: SYSTEM_PROMPT,
                    user: `Contexto do Cliente e Conversa:\n${JSON.stringify(context, null, 2)}`,
                },
                response: content,
                messagesCount: 2,
                route: CALL_SITE,
                metadata: {
                    callSite: CALL_SITE,
                    usageSource: trackedResponse.usage.usageSource,
                    totalTokens: trackedResponse.usage.totalTokens,
                    tokensUsedToday: trackedResponse.tokensUsedToday,
                    dailyLimit: trackedResponse.dailyLimit,
                },
            });

            await frankEventsRepository.insertEvent({
                tenantId,
                sessionId: context.conversation.id,
                correlationId,
                kind: 'ai.chat',
                payloadJson: eventPayload,
                provider: 'openai',
                model: MODEL,
                latencyMs,
                tokensPrompt: promptTokens,
                tokensCompletion: completionTokens,
                ragUsed: false,
                ragChunks: 0,
                ragLatencyMs: 0,
            });

            if (trackedResponse.usage.totalTokens > 0) {
                await tokenUsageEventsRepository.insertUsageEvent({
                    traceId: correlationId,
                    tenantId,
                    model: MODEL,
                    inputTokens: promptTokens,
                    outputTokens: completionTokens,
                    type: 'usage',
                });
            }

            const rawJson = JSON.parse(content);
            return FrankDraftSchema.parse(rawJson);
        } catch (error) {
            if (isControlledFrankError(error)) {
                throw error;
            }

            logger.error('Error generating Frank structured draft', error as Error, {
                tenantId,
                callSite: CALL_SITE,
            });

            return buildFallbackDraft();
        }
    },
};
