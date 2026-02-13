/**
 * Conversation State Machine.
 * Defines all possible states, transitions, and actions in the conversation flow.
 * This is the heart of the conversational framework.
 */

import { BusinessError, ErrorCode } from '../../infra/errors';
import { logger } from '../../infra/logger';

/**
 * All possible conversation states.
 */
export enum ConversationState {
  IDLE = 'IDLE',                       // No active conversation
  AWAITING_CEP = 'AWAITING_CEP',       // Waiting for destination CEP
  AWAITING_QUANTITY = 'AWAITING_QUANTITY', // Waiting for quantity
  CALCULATING = 'CALCULATING',         // Processing freight calculation
  COMPLETED = 'COMPLETED',             // Conversation completed
  ERROR = 'ERROR',                     // Error state
}

/**
 * Events that trigger state transitions.
 */
export enum ConversationEvent {
  START_FREIGHT_QUERY = 'START_FREIGHT_QUERY',
  CEP_PROVIDED = 'CEP_PROVIDED',
  QUANTITY_PROVIDED = 'QUANTITY_PROVIDED',
  CALCULATION_SUCCESS = 'CALCULATION_SUCCESS',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  RESET = 'RESET',
  ERROR = 'ERROR',
}

/**
 * State transition definition.
 */
interface StateTransition {
  from: ConversationState;
  event: ConversationEvent;
  to: ConversationState;
  guard?: (context: ConversationContext) => boolean;
  action?: (context: ConversationContext) => void | Promise<void>;
}

/**
 * Conversation context (data carried through the conversation).
 */
export interface ConversationContext {
  phoneNumber: string;
  currentState: ConversationState;
  cep?: string;
  quantity?: number;
  totalWeight?: number;
  lastMessage?: string;
  errorCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * State Machine class.
 */
export class StateMachine {
  private transitions: StateTransition[] = [];

  constructor() {
    this.defineTransitions();
  }

  /**
   * Define all valid state transitions.
   */
  private defineTransitions(): void {
    this.transitions = [
      // IDLE → AWAITING_CEP (user starts freight query)
      {
        from: ConversationState.IDLE,
        event: ConversationEvent.START_FREIGHT_QUERY,
        to: ConversationState.AWAITING_CEP,
      },

      // AWAITING_CEP → AWAITING_QUANTITY (valid CEP provided)
      {
        from: ConversationState.AWAITING_CEP,
        event: ConversationEvent.CEP_PROVIDED,
        to: ConversationState.AWAITING_QUANTITY,
        guard: (ctx) => this.isValidCEP(ctx.cep),
      },

      // AWAITING_QUANTITY → CALCULATING (valid quantity provided)
      {
        from: ConversationState.AWAITING_QUANTITY,
        event: ConversationEvent.QUANTITY_PROVIDED,
        to: ConversationState.CALCULATING,
        guard: (ctx) => this.isValidQuantity(ctx.quantity),
        action: (ctx) => {
          // Calculate total weight
          const unitWeight = 0.3; // Default, should come from config
          ctx.totalWeight = (ctx.quantity || 0) * unitWeight;
        },
      },

      // CALCULATING → COMPLETED (calculation successful)
      {
        from: ConversationState.CALCULATING,
        event: ConversationEvent.CALCULATION_SUCCESS,
        to: ConversationState.COMPLETED,
      },

      // CALCULATING → ERROR (calculation failed)
      {
        from: ConversationState.CALCULATING,
        event: ConversationEvent.CALCULATION_ERROR,
        to: ConversationState.ERROR,
      },

      // Any state → IDLE (reset conversation)
      {
        from: ConversationState.AWAITING_CEP,
        event: ConversationEvent.RESET,
        to: ConversationState.IDLE,
      },
      {
        from: ConversationState.AWAITING_QUANTITY,
        event: ConversationEvent.RESET,
        to: ConversationState.IDLE,
      },
      {
        from: ConversationState.CALCULATING,
        event: ConversationEvent.RESET,
        to: ConversationState.IDLE,
      },
      {
        from: ConversationState.COMPLETED,
        event: ConversationEvent.RESET,
        to: ConversationState.IDLE,
      },
      {
        from: ConversationState.ERROR,
        event: ConversationEvent.RESET,
        to: ConversationState.IDLE,
      },

      // Any state → ERROR (error occurred)
      {
        from: ConversationState.AWAITING_CEP,
        event: ConversationEvent.ERROR,
        to: ConversationState.ERROR,
      },
      {
        from: ConversationState.AWAITING_QUANTITY,
        event: ConversationEvent.ERROR,
        to: ConversationState.ERROR,
      },
    ];
  }

  /**
   * Transition to a new state based on an event.
   */
  async transition(context: ConversationContext, event: ConversationEvent): Promise<ConversationContext> {
    const currentState = context.currentState;

    // Find matching transition
    const transition = this.transitions.find(
      (t) => t.from === currentState && t.event === event
    );

    if (!transition) {
      logger.warn('Invalid state transition attempted', {
        from: currentState,
        event,
        phoneNumber: context.phoneNumber,
      });

      throw new BusinessError(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Invalid transition from ${currentState} with event ${event}`,
        { currentState, event }
      );
    }

    // Check guard condition
    if (transition.guard && !transition.guard(context)) {
      logger.warn('State transition guard failed', {
        from: currentState,
        to: transition.to,
        event,
        phoneNumber: context.phoneNumber,
      });

      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'Transition guard condition not met',
        { currentState, event }
      );
    }

    // Execute action
    if (transition.action) {
      await transition.action(context);
    }

    // Update state
    const newContext = {
      ...context,
      currentState: transition.to,
    };

    logger.stateTransition(currentState, transition.to, context.phoneNumber, {
      event,
      cep: context.cep,
      quantity: context.quantity,
    });

    return newContext;
  }

  /**
   * Check if a transition is valid.
   */
  canTransition(from: ConversationState, event: ConversationEvent): boolean {
    return this.transitions.some((t) => t.from === from && t.event === event);
  }

  /**
   * Get all possible events from a state.
   */
  getPossibleEvents(state: ConversationState): ConversationEvent[] {
    return this.transitions
      .filter((t) => t.from === state)
      .map((t) => t.event);
  }

  /**
   * Validate CEP format.
   */
  private isValidCEP(cep?: string): boolean {
    if (!cep) return false;
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8;
  }

  /**
   * Validate quantity.
   */
  private isValidQuantity(quantity?: number): boolean {
    return typeof quantity === 'number' && quantity > 0;
  }
}

// Export singleton instance
export const stateMachine = new StateMachine();
