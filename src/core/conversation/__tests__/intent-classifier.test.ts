/**
 * Intent Classifier tests.
 */

import { describe, it, expect } from 'vitest';
import { intentClassifier, UserIntent } from '../intent-classifier';

describe('IntentClassifier', () => {
  describe('classify', () => {
    it('should classify freight query intent', () => {
      const messages = [
        'frete',
        'calcular frete',
        'quanto custa o frete',
        'valor do frete',
        'cotação de frete',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.FREIGHT_QUERY);
      }
    });

    it('should classify CEP provision intent', () => {
      const messages = [
        '01001-000',
        '01001000',
        'CEP 01001-000',
        'meu cep é 01001000',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.PROVIDE_CEP);
        expect(result.extractedData?.cep).toBe('01001000');
      }
    });

    it('should classify quantity provision intent', () => {
      const messages = [
        '5',
        '10',
        '100',
        'quero 5 unidades',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.PROVIDE_QUANTITY);
        expect(result.extractedData?.quantity).toBeGreaterThan(0);
      }
    });

    it('should classify reset intent', () => {
      const messages = [
        'reiniciar',
        'recomeçar',
        'restart',
        'reset',
        'voltar',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.RESET);
      }
    });

    it('should classify cancel intent', () => {
      const messages = [
        'cancelar',
        'cancel',
        'sair',
        'parar',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.CANCEL);
      }
    });

    it('should classify help intent', () => {
      const messages = [
        'ajuda',
        'help',
        'socorro',
        'como funciona',
        'não entendi',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.HELP);
      }
    });

    it('should classify tracking query intent', () => {
      const messages = [
        'rastrear',
        'rastreio',
        'onde está meu pedido',
        'status do pedido',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.TRACK_ORDER);
      }
    });

    it('should classify payment query intent', () => {
      const messages = [
        'pagamento',
        'boleto',
        'pix',
        'segunda via',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.PAYMENT_STATUS);
      }
    });

    it('should classify human support request intent', () => {
      const messages = [
        'atendente',
        'falar com humano',
        'falar com alguém',
        'pessoa',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.HUMAN_SUPPORT);
      }
    });

    it('should classify unknown intent', () => {
      const messages = [
        'xyzabc',
        'random text',
        '!!!',
      ];

      for (const message of messages) {
        const result = intentClassifier.classify(message);
        expect(result.intent).toBe(UserIntent.UNKNOWN);
      }
    });
  });

  describe('hasMultipleIntents', () => {
    it('should detect multiple intents', () => {
      const message = 'frete para 01001-000 com 5 unidades';
      expect(intentClassifier.hasMultipleIntents(message)).toBe(true);
    });

    it('should detect single intent', () => {
      const message = 'frete';
      expect(intentClassifier.hasMultipleIntents(message)).toBe(false);
    });
  });
});
