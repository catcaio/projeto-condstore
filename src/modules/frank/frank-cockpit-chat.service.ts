import { logger } from '@/infra/logger';
import { getDb } from '@/infra/db';
import { eq, and, gte, or, like, desc } from 'drizzle-orm';
import { operationalEvents, FrankExecutionRunRecord } from '@/drizzle/schema';
import { frankExecutionStateService } from './frank-execution-state.service';
import { runTool } from './tools/tool-runner';
import { evaluateFrankToolPolicy, FrankToolAction } from './tools/tool-policy';
import { getSystemKnowledgeContext } from './frank-system-knowledge';
import { getAIProviderWithMeta } from '@/core/ai/llm-gateway';
import { messageRepository } from '@/infra/repositories/message.repository';

export interface CockpitChatMessageInput {
    tenantId: string;
    userId: string;
    message: string;
    context?: {
        module?: string;
        entityId?: string;
        readableContext?: string;
    };
    executionId?: string;
    humanApproval?: {
        stepId: string;
        approved: boolean;
        approvedBy?: string;
    };
}

export type StreamEventType =
    | 'status'
    | 'tool_call'
    | 'evidence'
    | 'human_gate_required'
    | 'chunk'
    | 'done'
    | 'error';

export interface StreamEvent {
    type: StreamEventType;
    message?: string;
    tool?: string;
    data?: unknown;
    stepId?: string;
    action?: string;
    riskLevel?: string;
    payload?: unknown;
    content?: string;
    executionId?: string;
    error?: string;
}

export class FrankCockpitChatService {
    /**
     * Processes a chat message in the Cockpit context, executing real system observation,
     * tool calls, Human Gate evaluation, and generating an evidence-based response.
     */
    async processChatMessage(
        input: CockpitChatMessageInput,
        onEvent: (event: StreamEvent) => void
    ): Promise<{ text: string; executionId: string }> {
        const { tenantId, userId, message, context, humanApproval } = input;
        const lowercaseMsg = message.toLowerCase().trim();

        logger.info('Frank Cockpit Chat processing started', {
            tenantId,
            userId,
            messageLength: message.length,
            module: context?.module,
        });

        onEvent({ type: 'status', message: 'Iniciando runtime do Frank Supremo...' });

        // 1. Ensure or retrieve Execution Run
        let runRecord: FrankExecutionRunRecord;
        if (input.executionId) {
            const existing = await frankExecutionStateService.getExecutionWithSteps(tenantId, input.executionId);
            if (existing) {
                runRecord = existing.run;
            } else {
                runRecord = await frankExecutionStateService.createRun({
                    tenantId,
                    title: `Chat Cockpit: ${message.slice(0, 40)}`,
                    triggerSource: 'MANUAL',
                    autonomyLevel: 'SUGGEST',
                    contextJson: { context, userId },
                });
            }
        } else {
            runRecord = await frankExecutionStateService.createRun({
                tenantId,
                title: `Chat Cockpit: ${message.slice(0, 40)}`,
                triggerSource: 'MANUAL',
                autonomyLevel: 'SUGGEST',
                contextJson: { context, userId },
            });
        }

        await frankExecutionStateService.updateRunStatus(runRecord.id, 'RUNNING');

        // 2. Process Human Gate Approval if supplied
        if (humanApproval && humanApproval.stepId) {
            onEvent({ type: 'status', message: 'Processando resposta do Human Gate...' });
            if (humanApproval.approved) {
                await frankExecutionStateService.approveStep(
                    tenantId,
                    humanApproval.stepId,
                    humanApproval.approvedBy || userId
                );

                onEvent({ type: 'status', message: 'Aprovação recebida. Executando ação aprovada...' });

                // Retrieve step details and execute
                const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantId, runRecord.executionId);
                const step = runDetails?.steps.find(s => s.id === humanApproval.stepId);

                if (step && step.actionType) {
                    await frankExecutionStateService.updateStepCheckpoint(tenantId, step.id, 'RUNNING');

                    const toolResult = await runTool(
                        step.actionType as FrankToolAction,
                        step.inputPayload as any,
                        {
                            tenantId,
                            requestId: runRecord.executionId,
                            allowHighRisk: true,
                            humanApprovalToken: `approved_by_${humanApproval.approvedBy || userId}`,
                        }
                    );

                    if (toolResult.ok) {
                        await frankExecutionStateService.updateStepCheckpoint(
                            tenantId,
                            step.id,
                            'COMPLETED',
                            toolResult.data as Record<string, unknown>
                        );
                        onEvent({
                            type: 'evidence',
                            message: `Ação ${step.actionType} executada com sucesso.`,
                            data: toolResult.data,
                        });
                    } else {
                        await frankExecutionStateService.updateStepCheckpoint(
                            tenantId,
                            step.id,
                            'FAILED',
                            undefined,
                            undefined,
                            toolResult.error?.message
                        );
                        onEvent({
                            type: 'error',
                            error: `Falha na execução: ${toolResult.error?.message}`,
                        });
                    }
                }
            } else {
                await frankExecutionStateService.updateStepCheckpoint(
                    tenantId,
                    humanApproval.stepId,
                    'SKIPPED',
                    undefined,
                    undefined,
                    'Rejeitado pelo operador humano'
                );
                onEvent({ type: 'status', message: 'Ação rejeitada pelo operador humano.' });
            }
        }

        // 3. Gather real system evidence for context
        onEvent({ type: 'status', message: 'Consultando estado do sistema e eventos reais...' });
        const evidence: Record<string, unknown> = {};

        try {
            const db = await getDb();

            // a) Recent operational errors/incidents in last 24h
            if (db) {
                const recentErrors = await db.select()
                    .from(operationalEvents)
                    .where(
                        and(
                            eq(operationalEvents.tenantId, tenantId),
                            gte(operationalEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
                            or(
                                like(operationalEvents.eventType, '%FAILED%'),
                                like(operationalEvents.eventType, '%ERROR%'),
                                like(operationalEvents.eventType, '%DROP%')
                            )
                        )
                    )
                    .orderBy(desc(operationalEvents.createdAt))
                    .limit(10);

                evidence.recentErrors24h = recentErrors.map(e => ({
                    id: e.id,
                    eventType: e.eventType,
                    createdAt: e.createdAt,
                    payload: e.payload,
                }));
            }

            // b) Message metrics today
            const msgMetrics = await messageRepository.getMetricsToday(tenantId);
            evidence.mensagensHoje = msgMetrics.total;

            // c) Active executions
            const runDetails = await frankExecutionStateService.getExecutionWithSteps(tenantId, runRecord.executionId);
            evidence.activeExecution = {
                executionId: runRecord.executionId,
                status: runRecord.status,
                steps: runDetails?.steps.map(s => ({
                    stepNumber: s.stepNumber,
                    name: s.stepName,
                    action: s.actionType,
                    status: s.status,
                    risk: s.riskClass,
                })),
            };

            // d) Domain knowledge
            evidence.systemDomainKnowledge = getSystemKnowledgeContext(context?.module);

        } catch (err: any) {
            logger.warn('Failed to gather partial evidence for Frank Cockpit Chat', { tenantId, err });
        }

        // 4. Trigger read-only tools based on intent & context
        if ((lowercaseMsg.includes('status do pedido') || lowercaseMsg.includes('pedido #') || lowercaseMsg.includes('pedido id')) && context?.entityId) {
            onEvent({ type: 'tool_call', tool: 'get_order_status', data: { orderId: context.entityId } });
            const orderStatusResult = await runTool('get_order_status', { tenantId, orderId: context.entityId }, {
                tenantId,
                requestId: runRecord.executionId,
            });

            if (orderStatusResult.ok) {
                evidence.orderStatus = orderStatusResult.data;
                onEvent({ type: 'evidence', message: 'Status do pedido consultado.', data: orderStatusResult.data });
            }
        }

        if ((lowercaseMsg.includes('rastreio') || lowercaseMsg.includes('shipment') || lowercaseMsg.includes('entrega')) && context?.entityId) {
            onEvent({ type: 'tool_call', tool: 'get_shipment_status', data: { shipmentId: context.entityId } });
            const shipmentStatusResult = await runTool('get_shipment_status', { tenantId, shipmentId: context.entityId }, {
                tenantId,
                requestId: runRecord.executionId,
            });

            if (shipmentStatusResult.ok) {
                evidence.shipmentStatus = shipmentStatusResult.data;
                onEvent({ type: 'evidence', message: 'Status do envio/shipment consultado.', data: shipmentStatusResult.data });
            }
        }

        if ((lowercaseMsg.includes('cliente') || lowercaseMsg.includes('histórico do cliente')) && context?.entityId) {
            onEvent({ type: 'tool_call', tool: 'get_customer_context', data: { customerId: context.entityId } });
            const customerContextResult = await runTool('get_customer_context', { tenantId, customerId: context.entityId }, {
                tenantId,
                requestId: runRecord.executionId,
            });

            if (customerContextResult.ok && customerContextResult.data) {
                evidence.customerContext = customerContextResult.data;
                onEvent({ type: 'evidence', message: 'Contexto do cliente consultado.', data: customerContextResult.data });
            }
        }

        onEvent({
            type: 'evidence',
            message: 'Evidências do sistema coletadas com sucesso.',
            data: evidence,
        });

        // 5. Check if message triggers a tool or high-risk action request requiring Human Gate
        if (lowercaseMsg.includes('criar pedido') || lowercaseMsg.includes('gerar pedido') || lowercaseMsg.includes('converter cotação')) {
            onEvent({ type: 'status', message: 'Avaliando política de segurança para ação de pedido...' });

            const policyDecision = evaluateFrankToolPolicy('create_order_from_quote', {
                tenantId,
                requestId: runRecord.executionId,
            });

            if (!policyDecision.allowed && policyDecision.reason === 'missing_human_approval_token') {
                // Register step in Frank Execution State
                const step = await frankExecutionStateService.addStep({
                    executionRunId: runRecord.id,
                    tenantId,
                    stepNumber: 1,
                    stepName: 'Criar pedido a partir de cotação aceita',
                    actionType: 'create_order_from_quote',
                    riskClass: 'CRITICAL',
                    requiresHumanApproval: true,
                    inputPayload: { context, message },
                });

                await frankExecutionStateService.updateRunStatus(runRecord.id, 'PAUSED_HUMAN_APPROVAL');

                onEvent({
                    type: 'human_gate_required',
                    stepId: step.id,
                    action: 'create_order_from_quote',
                    riskLevel: 'HIGH_RISK',
                    payload: {
                        title: 'Aprovação para Criação de Pedido',
                        description: 'A ação de criar pedido a partir de cotação exige confirmação humana por política de segurança (CRITICAL/HIGH_RISK).',
                        details: {
                            tenantId,
                            module: context?.module,
                            entityId: context?.entityId,
                        },
                    },
                });

                const responseText = `⚠️ **Ação Requer Aprovação Humana (Human Gate)**\n\nA criação de pedidos é classificada como **CRITICAL** e exige confirmação explícita de um gestor/operador antes da execução.\n\nPor favor, utilize o painel de aprovação acima para autorizar ou recusar esta operação.`;
                onEvent({ type: 'chunk', content: responseText });
                onEvent({ type: 'done', executionId: runRecord.executionId });

                return { text: responseText, executionId: runRecord.executionId };
            }
        }

        // 6. Generate final response using real LLM provider
        onEvent({ type: 'status', message: 'Sintetizando resposta baseada em evidências reais...' });

        let replyText = '';
        try {
            const { provider } = await getAIProviderWithMeta(tenantId);

            const systemPrompt = `
Você é Frank, o assistente operacional e agente do CONDSTORE OS no Cockpit.
Seu papel é analisar os dados reais do sistema, responder com clareza e transparência com base em EVIDÊNCIAS reais.

Instruções Estritas:
1. Siga a cadeia: EVIDÊNCIA → INFERÊNCIA → HIPÓTESE → CAUSA CONFIRMADA.
2. NUNCA declare uma hipótese como causa confirmada sem evidência suficiente do banco.
3. Se não houver dados ou houver erros, diga abertamente que consultou os registros e explique o estado atual do tenant (${tenantId}).
4. Responda em Português do Brasil com tom profissional, direto e acionável.

Módulo do Cockpit em visualização: ${context?.module || 'Geral'}
Entidade ativa: ${context?.entityId || 'Nenhuma'}
`;

            const userPrompt = `
Pergunta do Usuário: "${message}"

Evidências coletadas no sistema real:
${JSON.stringify(evidence, null, 2)}
`;

            const response = await provider.chat({
                tenantId,
                system: systemPrompt,
                user: userPrompt,
                responseFormat: 'text',
                route: '/api/cockpit/frank/chat',
            });

            replyText = response.text;
        } catch (llmError: any) {
            logger.warn('Failed to call LLM provider for Frank Cockpit Chat, falling back to deterministic synthesis', { tenantId, llmError });

            // Deterministic evidence-based synthesis if LLM provider fails or key missing
            const recentErrs = (evidence.recentErrors24h as any[]) || [];
            replyText = `**Análise do Sistema para o Tenant \`${tenantId}\`:**\n\n`;

            if (lowercaseMsg.includes('estado') || lowercaseMsg.includes('saúde') || lowercaseMsg.includes('status')) {
                replyText += `• **Status Geral:** Sistema operacional.\n`;
                replyText += `• **Mensagens Hoje:** ${evidence.mensagensHoje || 0}\n`;
                replyText += `• **Erros/Falhas nas últimas 24h:** ${recentErrs.length}\n`;
                if (recentErrs.length > 0) {
                    replyText += `\n**Últimos Eventos de Atenção:**\n`;
                    recentErrs.slice(0, 3).forEach(e => {
                        replyText += `  - \`${e.eventType}\` (${new Date(e.createdAt).toLocaleTimeString('pt-BR')})\n`;
                    });
                }
            } else if (lowercaseMsg.includes('erro') || lowercaseMsg.includes('falha') || lowercaseMsg.includes('incidente')) {
                if (recentErrs.length === 0) {
                    replyText += `✅ Nenhum erro ou falha operacional registrada nas últimas 24 horas para este tenant.`;
                } else {
                    replyText += `⚠️ Foram encontrados **${recentErrs.length} erro(s)** nas últimas 24h:\n\n`;
                    recentErrs.forEach((e, idx) => {
                        replyText += `${idx + 1}. \`${e.eventType}\` às ${new Date(e.createdAt).toLocaleTimeString('pt-BR')}\n`;
                    });
                }
            } else {
                replyText += `Consultei o banco de dados do tenant \`${tenantId}\`.\n`;
                replyText += `• **Mensagens hoje:** ${evidence.mensagensHoje || 0}\n`;
                replyText += `• **Ocorrências de erro nas últimas 24h:** ${recentErrs.length}\n\n`;
                replyText += `Como assistente supervisionado do Cockpit, posso consultar o status do sistema, pedidos, entregas e execuções ativas.`;
            }
        }

        await frankExecutionStateService.updateRunStatus(runRecord.id, 'COMPLETED', undefined, { replyText });

        onEvent({ type: 'chunk', content: replyText });
        onEvent({ type: 'done', executionId: runRecord.executionId });

        return { text: replyText, executionId: runRecord.executionId };
    }
}

export const frankCockpitChatService = new FrankCockpitChatService();
