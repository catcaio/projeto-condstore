import { OpenAI } from 'openai';
import { frankContextBuilder, FrankContextPayload } from './frank.context-builder';

// We instantiate OpenAI assuming the environment holds OPENAI_API_KEY
// Fallback gracefully if not present in the runtime so the build doesn't crash
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

import { FrankDraftSchema, FrankOperationalDraft } from './frank.schema';
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

export const frankSuggestions = {
    async generateSuggestions(context: FrankContextPayload): Promise<FrankOperationalDraft> {
        // If API Key is missing and it's running in dummy mode, return a fallback so the UI isn't broken
        if (process.env.OPENAI_API_KEY === undefined || process.env.OPENAI_API_KEY === '') {
            return {
                summary: "O Assistente Frank está temporariamente desabilitado por falta de integração configurada.",
                suggestedReplyDraft: "Não foi possível gerar dica automática.",
                suggestedAction: "NONE",
                actionPayload: null,
                insights: ["Configure OPENAI_API_KEY nas variáveis de ambiente."],
                warnings: [],
                confidence: "LOW"
            };
        }

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `Contexto do Cliente e Conversa:\n${JSON.stringify(context, null, 2)}` }
                ],
                temperature: 0.2, // Low temp for determinism
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("Empty or invalid structured response from OpenAI");
            }
            
            // Validate and strip unknown keys using Zod
            const rawJson = JSON.parse(content);
            const parsed = FrankDraftSchema.parse(rawJson);
            
            return parsed;

        } catch (error) {
            console.error('Error generating Frank structured draft:', error);
            return {
                summary: "Falha ao gerar análise estruturada pelo Frank AI.",
                suggestedReplyDraft: null,
                suggestedAction: "NONE",
                actionPayload: null,
                insights: ["Tente novamente mais tarde. Erro interno no LLM."],
                warnings: ["Falha de integração."],
                confidence: "LOW"
            };
        }
    }
};
