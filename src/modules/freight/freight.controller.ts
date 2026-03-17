import { BusinessError, ErrorCode } from '../../infra/errors';
import { logger } from '../../infra/logger';
import { ConversationEvent, ConversationState, stateMachine } from '../../core/conversation/state-machine';
import { sessionManager } from '../../core/conversation/session-manager';
import { freightService } from './freight.service';
import { planEnforcementService } from '@/modules/finops';
import { funnelRepository, FunnelStage } from '../funnel/funnel.repository';
import { appConfig } from '../../config/app.config';
import type { AttributionSnapshot } from '../../infra/attribution/attribution.types';

export class FreightController {
    async handleIncoming(
        tenantId: string,
        phoneNumber: string,
        message: string,
        messageSid?: string,
        attribution?: AttributionSnapshot | null,
        requestId?: string,
    ): Promise<string | null> {
        try {
            // Plan Enforcement for whatsapp_outbound
            const enforcement = await planEnforcementService.enforcePlanLimit(tenantId, 'whatsapp_outbound');
            if (!enforcement.allowed) {
                logger.warn('Plan limit exceeded for whatsapp_outbound', { tenantId, phoneNumber });
                // Return null to drop the message silently and save costs
                return null;
            }

            let session = await sessionManager.getSession(tenantId, phoneNumber);

            if (!session) {
                return await this.startFreightQuery(tenantId, phoneNumber, messageSid, attribution ?? null, requestId);
            }

            if (attribution) {
                await sessionManager.updateSession(tenantId, phoneNumber, { attribution });
            }

            switch (session.currentState) {
                case ConversationState.AWAITING_CEP:
                    return await this.handleCEP(tenantId, phoneNumber, message, messageSid, requestId);

                case ConversationState.AWAITING_QUANTITY:
                    return await this.handleQuantity(tenantId, phoneNumber, message, messageSid, requestId);

                default:
                    await sessionManager.deleteSession(tenantId, phoneNumber);
                    return await this.startFreightQuery(tenantId, phoneNumber, messageSid, attribution ?? null, requestId);
            }
        } catch (error) {
            logger.error('Error handling freight incoming message', error as Error, { tenantId, phoneNumber });
            return 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.';
        }
    }

    private async startFreightQuery(
        tenantId: string,
        phoneNumber: string,
        messageSid?: string,
        attribution?: AttributionSnapshot | null,
        requestId?: string,
    ): Promise<string> {
        // Generate new session (initially IDLE, then transition to AWAITING_CEP)
        let session = await sessionManager.createSession(tenantId, phoneNumber);
        if (attribution) {
            session.attribution = attribution;
        }

        session = Object.assign(session, await stateMachine.transition(session, ConversationEvent.START_FREIGHT_QUERY));
        await sessionManager.updateSession(tenantId, phoneNumber, session as any);

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.FLOW_STARTED,
            attribution: session.attribution ?? null,
        });

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.INTENT_DETECTED,
            attribution: session.attribution ?? null,
        });

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.ASKED_CEP,
            attribution: session.attribution ?? null,
        });

        return 'Olá! Vou ajudar você a calcular o frete. Qual é o CEP de destino? (Apenas números)';
    }

    private async handleCEP(tenantId: string, phoneNumber: string, message: string, messageSid?: string, requestId?: string): Promise<string> {
        const session = await sessionManager.getSession(tenantId, phoneNumber);
        if (!session) throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session not found');

        const cep = message.replace(/\D/g, '');
        if (cep.length !== 8) {
            return 'CEP inválido. Por favor, envie os 8 números do seu CEP.';
        }

        const newContext = await stateMachine.transition(
            { ...session, cep },
            ConversationEvent.CEP_PROVIDED
        );
        await sessionManager.updateSession(tenantId, phoneNumber, Object.assign(session, newContext) as any);

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.CEP_PROVIDED,
            attribution: session.attribution ?? null,
        });

        return 'Perfeito! E qual quantidade de produtos você deseja cotar? (apenas números, exemplo: "1" ou "5")';
    }

    private async handleQuantity(tenantId: string, phoneNumber: string, message: string, messageSid?: string, requestId?: string): Promise<string> {
        const session = await sessionManager.getSession(tenantId, phoneNumber);
        if (!session || !session.cep) throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session/CEP not found');

        const amountMatches = message.match(/\d+/);
        if (!amountMatches) {
            return 'Quantidade inválida. Por favor, digite apenas números informando quantas unidades deseja.';
        }

        const quantity = parseInt(amountMatches[0], 10);
        if (quantity <= 0 || quantity > 500) {
            return 'Por favor, informe uma quantidade válida (entre 1 e 500).';
        }

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.QUANTITY_PROVIDED,
            attribution: session.attribution ?? null,
        });

        // Move to CALCULATING
        let calculatingSession = await stateMachine.transition(
            { ...session, quantity },
            ConversationEvent.QUANTITY_PROVIDED
        );
        await sessionManager.updateSession(tenantId, phoneNumber, Object.assign(session, calculatingSession) as any);

        // Perform calculation
        try {
            const result = await freightService.calculateFreight({
                destinationCep: session.cep,
                quantity,
                tenantId, // Ensure simulation logging happens
                attribution: session.attribution ?? null,
                requestId,
            });

            // Format result message
            let reply = `🚚 Opções de frete para o CEP ${session.cep} (${quantity} unidades):\n\n`;
            result.options.forEach(opt => {
                reply += `*${opt.carrier}* - ${opt.service}\n`;
                reply += `💰 Valor: R$ ${opt.price.toFixed(2).replace('.', ',')}\n`;
                reply += `⏳ Prazo estimado: ${opt.deliveryTime} dias úteis\n\n`;
            });
            reply += 'Deseja calcular outro frete? Basta enviar o novo CEP a qualquer momento.';

            // Transition to COMPLETED
            const completedSession = await stateMachine.transition(calculatingSession, ConversationEvent.CALCULATION_SUCCESS);
            await sessionManager.updateSession(tenantId, phoneNumber, Object.assign(calculatingSession, completedSession) as any);

            // Track Quote Sent
            void funnelRepository.saveEvent({
                tenantId,
                phoneNumber,
                sessionId: session.sessionId,
                stage: FunnelStage.FREIGHT_QUOTED,
                attribution: session.attribution ?? null,
            });

            return reply;

        } catch (err) {
            logger.error('Freight calculation failed', err as Error, { tenantId, phoneNumber, cep: session.cep, quantity });

            const errorSession = await stateMachine.transition(calculatingSession, ConversationEvent.CALCULATION_ERROR);
            await sessionManager.updateSession(tenantId, phoneNumber, Object.assign(calculatingSession, errorSession) as any);

            void funnelRepository.saveEvent({
                tenantId,
                phoneNumber,
                sessionId: session.sessionId,
                stage: FunnelStage.FLOW_ABORTED,
                attribution: session.attribution ?? null,
            });

            return 'Houve um problema ao calcular o frete para este CEP e quantidade. Por favor, verifique os dados e tente novamente mais tarde.';
        }
    }
}

export const freightController = new FreightController();
