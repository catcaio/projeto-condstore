/**
 * Freight Controller.
 * Orchestrates the freight calculation flow.
 * Coordinates between state machine, session manager, and freight service.
 */

import { BusinessError, ErrorCode, getUserMessage } from '../../infra/errors';
import { logger } from '../../infra/logger';
import { ConversationEvent, ConversationState } from '../../core/conversation/state-machine';
import { sessionManager } from '../../core/conversation/session-manager';
import { stateMachine } from '../../core/conversation/state-machine';
import { intentClassifier, UserIntent } from '../../core/conversation/intent-classifier';
import { freightService } from './freight.service';
import type { FreightRequest } from './freight.types';

export interface ProcessMessageRequest {
  phoneNumber: string;
  message: string;
}

export interface ProcessMessageResponse {
  reply: string;
  success: boolean;
}

class FreightController {
  /**
   * Process incoming message and return response.
   * This is the main entry point for the conversation flow.
   */
  async processMessage(request: ProcessMessageRequest): Promise<ProcessMessageResponse> {
    const { phoneNumber, message } = request;

    try {
      logger.info('Processing message', { phoneNumber, message });

      // Get or create session
      let session = await sessionManager.getSession(phoneNumber);

      if (!session) {
        session = await sessionManager.createSession(phoneNumber);
      }

      // Classify intent
      const intentResult = intentClassifier.classify(message, session.currentState);

      logger.debug('Intent classified', {
        phoneNumber,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        currentState: session.currentState,
      });

      // Handle intent
      const reply = await this.handleIntent(phoneNumber, session.currentState, intentResult.intent, message, intentResult.extractedData);

      return {
        reply,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to process message', error as Error, { phoneNumber, message });

      // Return user-friendly error message
      const reply = error instanceof BusinessError
        ? getUserMessage(error)
        : 'Desculpe, ocorreu um erro. Tente novamente mais tarde.';

      return {
        reply,
        success: false,
      };
    }
  }

  /**
   * Handle classified intent and return response.
   */
  private async handleIntent(
    phoneNumber: string,
    currentState: ConversationState,
    intent: UserIntent,
    message: string,
    extractedData?: Record<string, unknown>
  ): Promise<string> {
    // Handle reset/cancel
    if (intent === UserIntent.RESET || intent === UserIntent.CANCEL) {
      await sessionManager.deleteSession(phoneNumber);
      return 'Conversa reiniciada. Digite "frete" para começar uma nova cotação.';
    }

    // Handle help
    if (intent === UserIntent.HELP) {
      return this.getHelpMessage(currentState);
    }

    // Handle freight query
    if (intent === UserIntent.FREIGHT_QUERY) {
      return await this.startFreightQuery(phoneNumber);
    }

    // Handle CEP provision
    if (intent === UserIntent.PROVIDE_CEP && extractedData?.cep) {
      return await this.handleCEP(phoneNumber, extractedData.cep as string);
    }

    // Handle quantity provision
    if (intent === UserIntent.PROVIDE_QUANTITY && extractedData?.quantity) {
      return await this.handleQuantity(phoneNumber, extractedData.quantity as number);
    }

    // Handle future intents
    if (intent === UserIntent.TRACK_ORDER) {
      return 'Rastreamento de pedidos estará disponível em breve. Digite "frete" para calcular frete.';
    }

    if (intent === UserIntent.PAYMENT_STATUS) {
      return 'Consulta de pagamento estará disponível em breve. Digite "frete" para calcular frete.';
    }

    if (intent === UserIntent.HUMAN_SUPPORT) {
      return 'Atendimento humano estará disponível em breve. Por enquanto, posso ajudar com cotações de frete. Digite "frete" para começar.';
    }

    // Unknown intent
    return this.getContextualResponse(currentState);
  }

  /**
   * Start freight query flow.
   */
  private async startFreightQuery(phoneNumber: string): Promise<string> {
    const session = await sessionManager.getSession(phoneNumber);

    if (!session) {
      throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    // Transition to AWAITING_CEP
    const newContext = await stateMachine.transition(
      session,
      ConversationEvent.START_FREIGHT_QUERY
    );

    await sessionManager.updateSession(phoneNumber, newContext);

    return 'Olá! Vou ajudar você a calcular o frete. Qual é o CEP de destino?';
  }

  /**
   * Handle CEP provision.
   */
  private async handleCEP(phoneNumber: string, cep: string): Promise<string> {
    const session = await sessionManager.getSession(phoneNumber);

    if (!session) {
      throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    // Transition to AWAITING_QUANTITY
    const newContext = await stateMachine.transition(
      {
        ...session,
        cep,
      },
      ConversationEvent.CEP_PROVIDED
    );

    await sessionManager.updateSession(phoneNumber, newContext);

    return 'CEP recebido! Agora, quantas unidades você deseja?';
  }

  /**
   * Handle quantity provision and calculate freight.
   */
  private async handleQuantity(phoneNumber: string, quantity: number): Promise<string> {
    const session = await sessionManager.getSession(phoneNumber);

    if (!session || !session.cep) {
      throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session or CEP not found');
    }

    // Transition to CALCULATING
    const calculatingContext = await stateMachine.transition(
      {
        ...session,
        quantity,
      },
      ConversationEvent.QUANTITY_PROVIDED
    );

    await sessionManager.updateSession(phoneNumber, calculatingContext);

    try {
      // Calculate freight
      const freightRequest: FreightRequest = {
        destinationCep: session.cep,
        quantity,
      };

      const result = await freightService.calculateFreight(freightRequest);

      // Transition to COMPLETED
      const completedContext = await stateMachine.transition(
        calculatingContext,
        ConversationEvent.CALCULATION_SUCCESS
      );

      await sessionManager.updateSession(phoneNumber, completedContext);

      // Clear session after completion
      await sessionManager.deleteSession(phoneNumber);

      // Format and return response
      return freightService.formatOptionsForUser(result.options);
    } catch (error) {
      // Transition to ERROR
      await stateMachine.transition(
        calculatingContext,
        ConversationEvent.CALCULATION_ERROR
      );

      throw error;
    }
  }

  /**
   * Get help message based on current state.
   */
  private getHelpMessage(state: ConversationState): string {
    switch (state) {
      case ConversationState.IDLE:
        return 'Posso ajudar você a calcular o frete. Digite "frete" para começar.';
      case ConversationState.AWAITING_CEP:
        return 'Estou aguardando o CEP de destino. Digite o CEP no formato 01001-000 ou 01001000.';
      case ConversationState.AWAITING_QUANTITY:
        return 'Estou aguardando a quantidade de unidades. Digite um número (ex: 5).';
      default:
        return 'Digite "frete" para calcular o frete ou "ajuda" para mais informações.';
    }
  }

  /**
   * Get contextual response when intent is unknown.
   */
  private getContextualResponse(state: ConversationState): string {
    switch (state) {
      case ConversationState.AWAITING_CEP:
        return 'Não entendi. Por favor, digite o CEP de destino (ex: 01001-000).';
      case ConversationState.AWAITING_QUANTITY:
        return 'Não entendi. Por favor, digite a quantidade de unidades (ex: 5).';
      default:
        return 'Desculpe, não entendi. Digite "frete" para calcular o frete ou "ajuda" para mais informações.';
    }
  }
}

// Export singleton instance
export const freightController = new FreightController();
