import { IntentType, ActionType } from './intents';
import { logger } from '../../infra/logger';

export interface ActionResponse {
    type: ActionType;
    payload: any;
}

export interface RouterContext {
    tenantId: string;
    messageId: string;
    fromNumber: string;
    text: string;
}

export class IntentRouter {
    async route(intent: IntentType, context: RouterContext): Promise<ActionResponse> {
        try {
            switch (intent) {
                case IntentType.FREIGHT_QUOTE:
                    return this.handleFreightQuote(context);
                case IntentType.PRODUCT_INFO:
                    return this.handleProductInfo(context);
                case IntentType.HUMAN_HANDOFF:
                    return this.handleHumanHandoff(context);
                case IntentType.FALLBACK_HUMAN:
                case IntentType.UNKNOWN:
                default:
                    return this.handleFallback(context);
            }
        } catch (error) {
            logger.error('IntentRouter error', error as Error);
            return this.handleFallback(context);
        }
    }

    private async handleFreightQuote(context: RouterContext): Promise<ActionResponse> {
        // In V1, we just trigger the existing Freight Service logic (or return a payload that the webhook uses to trigger it)
        // For now, we'll return a payload that instructs the webhook to proceed with freight flow
        return {
            type: ActionType.FREIGHT_QUOTE,
            payload: {
                message: 'Calculando frete...', // This might be replaced by the actual service response
                targetService: 'FreightService'
            }
        };
    }

    private async handleProductInfo(context: RouterContext): Promise<ActionResponse> {
        return {
            type: ActionType.PRODUCT_INFO,
            payload: {
                message: 'Olá! Sou a IA da Construlojam. Posso ajudar com cotações de frete e informações sobre produtos. Como posso ajudar você hoje?'
            }
        };
    }

    private async handleHumanHandoff(context: RouterContext): Promise<ActionResponse> {
        return {
            type: ActionType.HUMAN_HANDOFF,
            payload: {
                message: 'Encaminhando para um atendente humano. Por favor, aguarde.',
                tags: ['atendimento_humano']
            }
        };
    }

    private async handleFallback(context: RouterContext): Promise<ActionResponse> {
        return {
            type: ActionType.FALLBACK,
            payload: {
                message: 'Desculpe, não entendi completamente. Vou encaminhar para um especialista.',
                tags: ['atendimento_humano', 'fallback']
            }
        };
    }
}

export const intentRouter = new IntentRouter();
