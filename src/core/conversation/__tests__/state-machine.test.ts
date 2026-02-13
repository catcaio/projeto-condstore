/**
 * State Machine tests.
 */

import { describe, it, expect } from 'vitest';
import { stateMachine, ConversationState, ConversationEvent, type ConversationContext } from '../state-machine';

describe('StateMachine', () => {
  describe('transition', () => {
    it('should transition from IDLE to AWAITING_CEP on START_FREIGHT_QUERY', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.IDLE,
      };

      const newContext = await stateMachine.transition(context, ConversationEvent.START_FREIGHT_QUERY);

      expect(newContext.currentState).toBe(ConversationState.AWAITING_CEP);
    });

    it('should transition from AWAITING_CEP to AWAITING_QUANTITY on CEP_PROVIDED with valid CEP', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.AWAITING_CEP,
        cep: '01001000',
      };

      const newContext = await stateMachine.transition(context, ConversationEvent.CEP_PROVIDED);

      expect(newContext.currentState).toBe(ConversationState.AWAITING_QUANTITY);
    });

    it('should fail transition from AWAITING_CEP to AWAITING_QUANTITY with invalid CEP', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.AWAITING_CEP,
        cep: '123', // Invalid CEP
      };

      await expect(
        stateMachine.transition(context, ConversationEvent.CEP_PROVIDED)
      ).rejects.toThrow();
    });

    it('should transition from AWAITING_QUANTITY to CALCULATING on QUANTITY_PROVIDED with valid quantity', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.AWAITING_QUANTITY,
        cep: '01001000',
        quantity: 5,
      };

      const newContext = await stateMachine.transition(context, ConversationEvent.QUANTITY_PROVIDED);

      expect(newContext.currentState).toBe(ConversationState.CALCULATING);
      expect(newContext.totalWeight).toBe(1.5); // 5 * 0.3kg
    });

    it('should fail transition from AWAITING_QUANTITY to CALCULATING with invalid quantity', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.AWAITING_QUANTITY,
        cep: '01001000',
        quantity: 0, // Invalid quantity
      };

      await expect(
        stateMachine.transition(context, ConversationEvent.QUANTITY_PROVIDED)
      ).rejects.toThrow();
    });

    it('should transition from CALCULATING to COMPLETED on CALCULATION_SUCCESS', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.CALCULATING,
        cep: '01001000',
        quantity: 5,
        totalWeight: 1.5,
      };

      const newContext = await stateMachine.transition(context, ConversationEvent.CALCULATION_SUCCESS);

      expect(newContext.currentState).toBe(ConversationState.COMPLETED);
    });

    it('should transition from any state to IDLE on RESET', async () => {
      const states = [
        ConversationState.AWAITING_CEP,
        ConversationState.AWAITING_QUANTITY,
        ConversationState.CALCULATING,
        ConversationState.COMPLETED,
        ConversationState.ERROR,
      ];

      for (const state of states) {
        const context: ConversationContext = {
          phoneNumber: '5511999999999',
          currentState: state,
        };

        const newContext = await stateMachine.transition(context, ConversationEvent.RESET);

        expect(newContext.currentState).toBe(ConversationState.IDLE);
      }
    });

    it('should throw error on invalid transition', async () => {
      const context: ConversationContext = {
        phoneNumber: '5511999999999',
        currentState: ConversationState.IDLE,
      };

      await expect(
        stateMachine.transition(context, ConversationEvent.CEP_PROVIDED)
      ).rejects.toThrow();
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      expect(stateMachine.canTransition(ConversationState.IDLE, ConversationEvent.START_FREIGHT_QUERY)).toBe(true);
      expect(stateMachine.canTransition(ConversationState.AWAITING_CEP, ConversationEvent.CEP_PROVIDED)).toBe(true);
      expect(stateMachine.canTransition(ConversationState.AWAITING_QUANTITY, ConversationEvent.QUANTITY_PROVIDED)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(stateMachine.canTransition(ConversationState.IDLE, ConversationEvent.CEP_PROVIDED)).toBe(false);
      expect(stateMachine.canTransition(ConversationState.COMPLETED, ConversationEvent.START_FREIGHT_QUERY)).toBe(false);
    });
  });

  describe('getPossibleEvents', () => {
    it('should return possible events for a state', () => {
      const events = stateMachine.getPossibleEvents(ConversationState.IDLE);
      expect(events).toContain(ConversationEvent.START_FREIGHT_QUERY);
    });
  });
});
