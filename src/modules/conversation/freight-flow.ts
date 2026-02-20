
import { ConversationService, ConversationStep, conversationService } from './conversation.service';
import { extractCep } from '../../lib/extraction';
import { freightControllerLegacy } from '../../legacy/freight.controller'; // Reusing legacy for service call
import { logger } from '../../infra/logger';
import { inboundMessageRepository } from '../llm/repositories/message.repository';
import { randomUUID } from 'crypto';

export interface FlowResult {
    reply: string;
    nextStep: ConversationStep;
    shouldClearState?: boolean;
}

export class FreightFlow {

    // Helper to log funnel events
    private async logEvent(tenantId: string, phoneNumber: string, sessionId: string, stage: string) {
        try {
            await inboundMessageRepository.saveFunnelEvent({
                tenantId,
                phoneNumber,
                sessionId,
                stage
            });
        } catch (error) {
            logger.warn('Failed to log funnel event', { error, stage });
        }
    }

    async handle(
        tenantId: string,
        phoneNumber: string,
        messageBody: string,
        currentStep: ConversationStep,
        context: any
    ): Promise<FlowResult> {

        const cleanMessage = messageBody.trim();

        // Ensure sessionId exists
        let sessionId = context?.sessionId;
        if (!sessionId) {
            sessionId = randomUUID();
            context = { ...context, sessionId };
        }

        // 1. Step: NONE (Initial trigger or re-entry)
        if (currentStep === 'NONE') {
            await this.logEvent(tenantId, phoneNumber, sessionId, 'INTENT_DETECTED');

            // Check if user already provided CEP in this first message
            const extractedCep = extractCep(cleanMessage);

            if (extractedCep) {
                // CEP found, execute immediately
                await this.logEvent(tenantId, phoneNumber, sessionId, 'CEP_RECEIVED');
                const result = await this.executeFreightQuote(tenantId, phoneNumber, extractedCep, sessionId);

                // Update state with new context (including sessionId)
                await conversationService.updateState(tenantId, phoneNumber, 'COMPLETED', { ...context, cep: extractedCep });

                return result;
            } else {
                // No CEP, ask for it
                await this.logEvent(tenantId, phoneNumber, sessionId, 'ASKED_CEP');
                await conversationService.updateState(tenantId, phoneNumber, 'AWAITING_CEP', context);
                return {
                    reply: 'Para calcular o frete, por favor, me informe seu CEP.',
                    nextStep: 'AWAITING_CEP'
                };
            }
        }

        // 2. Step: AWAITING_CEP
        if (currentStep === 'AWAITING_CEP') {
            const extractedCep = extractCep(cleanMessage);

            if (extractedCep) {
                // Valid CEP
                await this.logEvent(tenantId, phoneNumber, sessionId, 'CEP_RECEIVED');
                const result = await this.executeFreightQuote(tenantId, phoneNumber, extractedCep, sessionId);

                // Completed
                await conversationService.updateState(tenantId, phoneNumber, 'COMPLETED', { ...context, cep: extractedCep });

                return result;
            } else {
                // Invalid input for this step
                return {
                    reply: 'CEP inválido ou não encontrado. Por favor, digite um CEP válido (ex: 12345-678).',
                    nextStep: 'AWAITING_CEP'
                };
            }
        }

        // 3. Step: COMPLETED (But still in TTL)
        if (currentStep === 'COMPLETED') {
            return {
                reply: 'Já enviei sua cotação acima. Precisa de mais alguma coisa?',
                nextStep: 'COMPLETED'
            };
        }

        // Default fallback
        return {
            reply: 'Desculpe, me perdi. Vamos começar de novo?',
            nextStep: 'NONE',
            shouldClearState: true
        };
    }

    private async executeFreightQuote(tenantId: string, phoneNumber: string, cep: string, sessionId: string): Promise<FlowResult> {
        // Reuse legacy controller for actual calculation logic
        logger.info('Executing Freight Quote via Flow', { tenantId, phoneNumber, cep });

        const result = await freightControllerLegacy.processMessage({
            phoneNumber,
            message: cep,
            tenantId
        });

        // Quote Sent
        await this.logEvent(tenantId, phoneNumber, sessionId, 'QUOTE_SENT');

        return {
            reply: result.reply || 'Cotação realizada.',
            nextStep: 'COMPLETED'
        };
    }
}

export const freightFlow = new FreightFlow();
