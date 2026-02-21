import { BusinessError, ErrorCode } from '../../infra/errors';
import { logger } from '../../infra/logger';
import { ConversationEvent, ConversationState, stateMachine } from '../../core/conversation/state-machine';
import { sessionManager } from '../../core/conversation/session-manager';
import { freightService } from './freight.service';
import { funnelRepository, FunnelStage } from '../funnel/funnel.repository';
import { appConfig } from '../../config/app.config';

export class FreightController {
    async handleIncoming(tenantId: string, phoneNumber: string, message: string, messageSid?: string): Promise<{ replyMessage: string, sessionInfo: any }> {
        try {
            let session = await sessionManager.getSession(tenantId, phoneNumber);

            if (!session) {
                return await this.startFreightQuery(tenantId, phoneNumber, messageSid);
            }

            switch (session.currentState) {
                case ConversationState.AWAITING_CEP:
                    return await this.handleCEP(tenantId, phoneNumber, message, session, messageSid);

                case ConversationState.AWAITING_QUANTITY:
                    return await this.handleQuantity(tenantId, phoneNumber, message, session, messageSid);

                default:
                    await sessionManager.deleteSession(tenantId, phoneNumber);
                    return await this.startFreightQuery(tenantId, phoneNumber, messageSid);
            }
        } catch (error) {
            logger.error('Error handling freight incoming message', error as Error, { tenantId, phoneNumber });
            return {
                replyMessage: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.',
                sessionInfo: { outcome: 'error_caught' }
            };
        }
    }

    private async startFreightQuery(tenantId: string, phoneNumber: string, messageSid?: string): Promise<{ replyMessage: string, sessionInfo: any }> {
        // Generate new session (initially IDLE, then transition to AWAITING_CEP)
        let session = await sessionManager.createSession(tenantId, phoneNumber);

        session = Object.assign(session, await stateMachine.transition(session, ConversationEvent.START_FREIGHT_QUERY));
        await sessionManager.updateSession(tenantId, phoneNumber, session as any);

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.FLOW_STARTED,
        });

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.INTENT_DETECTED,
        });

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.ASKED_CEP,
        });

        return {
            replyMessage: 'Olá! Vou ajudar você a calcular o frete. Qual é o CEP de destino? (Apenas números)',
            sessionInfo: {
                sessionId: session.sessionId,
                currentState: ConversationState.IDLE,
                nextState: session.currentState,
                outcome: 'started_flow'
            }
        };
    }

    private async handleCEP(tenantId: string, phoneNumber: string, message: string, currentSession: any, messageSid?: string): Promise<{ replyMessage: string, sessionInfo: any }> {
        const session = await sessionManager.getSession(tenantId, phoneNumber);
        if (!session) throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session not found');

        const cep = message.replace(/\D/g, '');
        if (cep.length !== 8) {
            return {
                replyMessage: 'CEP inválido. Por favor, envie os 8 números do seu CEP.',
                sessionInfo: {
                    sessionId: session.sessionId,
                    currentState: currentSession.currentState,
                    nextState: currentSession.currentState,
                    outcome: 'invalid_cep_input'
                }
            };
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
        });

        return {
            replyMessage: 'Perfeito! E qual quantidade de produtos você deseja cotar? (apenas números, exemplo: "1" ou "5")',
            sessionInfo: {
                sessionId: session.sessionId,
                currentState: currentSession.currentState,
                nextState: newContext.currentState,
                outcome: 'cep_accepted'
            }
        };
    }

    private async handleQuantity(tenantId: string, phoneNumber: string, message: string, currentSession: any, messageSid?: string): Promise<{ replyMessage: string, sessionInfo: any }> {
        const session = await sessionManager.getSession(tenantId, phoneNumber);
        if (!session || !session.cep) throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session/CEP not found');

        const amountMatches = message.match(/\d+/);
        if (!amountMatches) {
            return {
                replyMessage: 'Quantidade inválida. Por favor, digite apenas números informando quantas unidades deseja.',
                sessionInfo: {
                    sessionId: session.sessionId,
                    currentState: currentSession.currentState,
                    nextState: currentSession.currentState,
                    outcome: 'invalid_quantity_input'
                }
            };
        }

        const quantity = parseInt(amountMatches[0], 10);
        if (quantity <= 0 || quantity > 500) {
            return {
                replyMessage: 'Por favor, informe uma quantidade válida (entre 1 e 500).',
                sessionInfo: {
                    sessionId: session.sessionId,
                    currentState: currentSession.currentState,
                    nextState: currentSession.currentState,
                    outcome: 'quantity_out_of_bounds'
                }
            };
        }

        void funnelRepository.saveEvent({
            tenantId,
            phoneNumber,
            sessionId: session.sessionId,
            stage: FunnelStage.QUANTITY_PROVIDED,
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
                tenantId // Ensure simulation logging happens
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
            });

            return {
                replyMessage: reply,
                sessionInfo: {
                    sessionId: session.sessionId,
                    currentState: currentSession.currentState,
                    nextState: completedSession.currentState,
                    outcome: 'freight_quoted_success'
                }
            };

        } catch (err) {
            logger.error('Freight calculation failed', err as Error, { tenantId, phoneNumber, cep: session.cep, quantity });

            const errorSession = await stateMachine.transition(calculatingSession, ConversationEvent.CALCULATION_ERROR);
            await sessionManager.updateSession(tenantId, phoneNumber, Object.assign(calculatingSession, errorSession) as any);

            void funnelRepository.saveEvent({
                tenantId,
                phoneNumber,
                sessionId: session.sessionId,
                stage: FunnelStage.FLOW_ABORTED,
            });

            return {
                replyMessage: 'Houve um problema ao calcular o frete para este CEP e quantidade. Por favor, verifique os dados e tente novamente mais tarde.',
                sessionInfo: {
                    sessionId: session.sessionId,
                    currentState: currentSession.currentState,
                    nextState: errorSession.currentState,
                    outcome: 'freight_calculation_failed'
                }
            };
        }
    }
}

export const freightController = new FreightController();
