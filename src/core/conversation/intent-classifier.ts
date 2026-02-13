/**
 * Intent Classifier.
 * Classifies user messages into intents to determine conversation flow.
 * Extensible for future intents (tracking, payment, human support, etc.).
 */

import { logger } from '../../infra/logger';

/**
 * All possible user intents.
 */
export enum UserIntent {
  FREIGHT_QUERY = 'FREIGHT_QUERY',       // User wants to calculate freight
  PROVIDE_CEP = 'PROVIDE_CEP',           // User is providing a CEP
  PROVIDE_QUANTITY = 'PROVIDE_QUANTITY', // User is providing a quantity
  RESET = 'RESET',                       // User wants to restart
  HELP = 'HELP',                         // User needs help
  CANCEL = 'CANCEL',                     // User wants to cancel
  
  // Future intents (for expansion)
  TRACK_ORDER = 'TRACK_ORDER',           // User wants to track an order
  PAYMENT_STATUS = 'PAYMENT_STATUS',     // User wants to check payment status
  HUMAN_SUPPORT = 'HUMAN_SUPPORT',       // User wants to talk to a human
  UNKNOWN = 'UNKNOWN',                   // Cannot classify intent
}

/**
 * Intent classification result.
 */
export interface IntentResult {
  intent: UserIntent;
  confidence: number; // 0-1
  extractedData?: {
    cep?: string;
    quantity?: number;
    [key: string]: unknown;
  };
}

class IntentClassifier {
  /**
   * Classify user message into an intent.
   */
  classify(message: string, currentState?: string): IntentResult {
    const normalized = this.normalize(message);

    // Check for reset/cancel commands first
    if (this.isResetIntent(normalized)) {
      return { intent: UserIntent.RESET, confidence: 1.0 };
    }

    if (this.isCancelIntent(normalized)) {
      return { intent: UserIntent.CANCEL, confidence: 1.0 };
    }

    if (this.isHelpIntent(normalized)) {
      return { intent: UserIntent.HELP, confidence: 1.0 };
    }

    // Check for CEP
    const cep = this.extractCEP(normalized);
    if (cep) {
      return {
        intent: UserIntent.PROVIDE_CEP,
        confidence: 1.0,
        extractedData: { cep },
      };
    }

    // Check for quantity
    const quantity = this.extractQuantity(normalized);
    if (quantity !== null) {
      return {
        intent: UserIntent.PROVIDE_QUANTITY,
        confidence: 1.0,
        extractedData: { quantity },
      };
    }

    // Check for freight query
    if (this.isFreightQuery(normalized)) {
      return { intent: UserIntent.FREIGHT_QUERY, confidence: 0.9 };
    }

    // Future intents
    if (this.isTrackingQuery(normalized)) {
      return { intent: UserIntent.TRACK_ORDER, confidence: 0.8 };
    }

    if (this.isPaymentQuery(normalized)) {
      return { intent: UserIntent.PAYMENT_STATUS, confidence: 0.8 };
    }

    if (this.isHumanSupportRequest(normalized)) {
      return { intent: UserIntent.HUMAN_SUPPORT, confidence: 0.9 };
    }

    // Unknown intent
    logger.debug('Unable to classify intent', { message: normalized, currentState });

    return { intent: UserIntent.UNKNOWN, confidence: 0.0 };
  }

  /**
   * Normalize message for classification.
   */
  private normalize(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  }

  /**
   * Check if message is a freight query.
   */
  private isFreightQuery(message: string): boolean {
    const keywords = [
      'frete',
      'cotacao',
      'cotação',
      'envio',
      'entrega',
      'shipping',
      'freight',
      'quanto custa',
      'valor do frete',
      'calcular frete',
    ];

    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Check if message is a reset command.
   */
  private isResetIntent(message: string): boolean {
    const keywords = ['reiniciar', 'recomecar', 'restart', 'reset', 'voltar', 'comecar de novo'];
    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Check if message is a cancel command.
   */
  private isCancelIntent(message: string): boolean {
    const keywords = ['cancelar', 'cancel', 'sair', 'parar', 'stop'];
    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Check if message is a help request.
   */
  private isHelpIntent(message: string): boolean {
    const keywords = ['ajuda', 'help', 'socorro', 'como funciona', 'nao entendi', 'não entendi'];
    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Check if message is a tracking query.
   */
  private isTrackingQuery(message: string): boolean {
    const keywords = ['rastrear', 'rastreio', 'tracking', 'onde esta', 'onde está', 'status do pedido'];
    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Check if message is a payment query.
   */
  private isPaymentQuery(message: string): boolean {
    const keywords = ['pagamento', 'payment', 'boleto', 'pix', 'pagar', 'segunda via'];
    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Check if message is a human support request.
   */
  private isHumanSupportRequest(message: string): boolean {
    const keywords = ['atendente', 'humano', 'pessoa', 'falar com alguem', 'falar com alguém', 'human', 'agent'];
    return keywords.some((kw) => message.includes(kw));
  }

  /**
   * Extract CEP from message.
   */
  private extractCEP(message: string): string | null {
    // Match CEP patterns: 12345-678 or 12345678
    const cepRegex = /\b(\d{5})-?(\d{3})\b/;
    const match = message.match(cepRegex);

    if (match) {
      return match[1] + match[2]; // Return without hyphen
    }

    return null;
  }

  /**
   * Extract quantity from message.
   */
  private extractQuantity(message: string): number | null {
    // Match numbers (1-9999)
    const quantityRegex = /\b(\d{1,4})\b/;
    const match = message.match(quantityRegex);

    if (match) {
      const quantity = parseInt(match[1], 10);
      return quantity > 0 && quantity < 10000 ? quantity : null;
    }

    return null;
  }

  /**
   * Check if a message contains multiple intents.
   */
  hasMultipleIntents(message: string): boolean {
    const normalized = this.normalize(message);
    let intentCount = 0;

    if (this.isFreightQuery(normalized)) intentCount++;
    if (this.extractCEP(normalized)) intentCount++;
    if (this.extractQuantity(normalized)) intentCount++;
    if (this.isTrackingQuery(normalized)) intentCount++;
    if (this.isPaymentQuery(normalized)) intentCount++;

    return intentCount > 1;
  }
}

// Export singleton instance
export const intentClassifier = new IntentClassifier();
