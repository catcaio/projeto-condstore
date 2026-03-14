export type InboundReplyPolicy = 
    | { type: 'ACK_ONLY' }
    | { type: 'SUPERVISED_NO_REPLY' }
    | { type: 'AUTO_REPLY_ALLOWED'; text: string };

export interface PolicyContext {
    tenantId: string;
    phoneHash: string;
    conversationState: 'NEW' | 'WAITING_CONSENT' | 'HUMAN_ACTIVE' | 'AI_SUPERVISED' | 'READY_FOR_APPROVAL' | 'CLOSED';
    hasConsent: boolean;
    productDetected: boolean;
    hasActiveSuggestion: boolean;
    systemMessage?: string;
    intent: string;
}

export function resolveInboundReplyPolicy(context: PolicyContext): InboundReplyPolicy {
    // 1. Consent always wins (LGPD)
    if (!context.hasConsent) {
        return {
            type: 'AUTO_REPLY_ALLOWED',
            text: "Para continuar, confirme que aceita nossa política de privacidade enviando 'Sim' ou 'Aceito'."
        };
    }

    // 2. Pure System Errors or Fallback Text
    if (context.systemMessage && !context.productDetected) {
         return {
            type: 'AUTO_REPLY_ALLOWED',
            text: context.systemMessage
        };
    }

    // 3. Human Active Routing - DO NOT AUTO REPLY
    if (context.conversationState === 'HUMAN_ACTIVE') {
        return { type: 'ACK_ONLY' };
    }

    // 4. Product Found -> Route to Copilot (Supervised)
    if (context.productDetected || context.hasActiveSuggestion) {
        return { type: 'SUPERVISED_NO_REPLY' };
    }

    // 5. Default Fallback
    return {
        type: 'AUTO_REPLY_ALLOWED',
        text: 'Recebi sua mensagem e já encaminhei para atendimento. Em instantes seguimos por aqui.'
    };
}
