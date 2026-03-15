export type InboundReplyPolicy = 
    | { type: 'ACK_ONLY' }
    | { type: 'SUPERVISED_NO_REPLY' }
    | { type: 'AUTO_REPLY_ALLOWED'; text: string };

import type { ConversationStatusType } from '@/drizzle/schema';

export interface PolicyContext {
    tenantId: string;
    phoneHash: string;
    conversationState: ConversationStatusType;
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
    if (context.conversationState === 'operator_active') {
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
