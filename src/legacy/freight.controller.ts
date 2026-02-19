// @ts-nocheck
/**
 * Freight Controller (legacy).
 * Kept for reference only — not imported by any active route.
 * Excluded from typecheck via tsconfig.build.json.
 */

import { BusinessError, ErrorCode, getUserMessage } from '../infra/errors';
import { logger } from '../infra/logger';
import { ConversationEvent, ConversationState } from '../core/conversation/state-machine';
import { sessionManager } from '../core/conversation/session-manager';
import type { FreightRequest } from '../modules/freight/freight.types';
import { freightService } from '../modules/freight/freight.service';

type TwilioIncoming = {
  Body?: string;
  From?: string;
  To?: string;
  MessageSid?: string;
};

function normalizePhoneNumber(raw?: string) {
  if (!raw) return '';
  return raw.replace('whatsapp:', '').trim();
}

function normalizeText(raw?: string) {
  return (raw ?? '').trim();
}

function safeTenantIdFromTo(to?: string) {
  // Legacy heuristic: derive tenant from "To" (Twilio WhatsApp number).
  // DO NOT log full "to" value.
  return (to ?? '').replace('whatsapp:', '').trim();
}

export class FreightControllerLegacy {
  async handleIncoming(payload: TwilioIncoming): Promise<string> {
    const message = normalizeText(payload.Body);
    const phoneNumber = normalizePhoneNumber(payload.From);
    const messageSid = payload.MessageSid ?? '';
    const tenantId = safeTenantIdFromTo(payload.To);

    if (!phoneNumber) {
      return getUserMessage(new BusinessError(ErrorCode.INVALID_INPUT, 'Missing phone'));
    }
    if (!tenantId) {
      return getUserMessage(new BusinessError(ErrorCode.INVALID_INPUT, 'Missing tenant'));
    }

    // PII-safe logs only
    logger.info('legacy.freight.incoming', {
      tenantId,
      hasMessage: Boolean(message),
      messageSid: messageSid ? '[present]' : '[missing]',
    });

    // Load session
    let session = await sessionManager.getSession(tenantId, phoneNumber);

    // If no session, initialize flow
    if (!session) {
      return await this.startFreightQuery(phoneNumber, tenantId);
    }

    // Route by state
    switch (session.state) {
      case ConversationState.WAITING_CEP:
        return await this.handleCEP(phoneNumber, tenantId, message, messageSid);

      case ConversationState.WAITING_QUANTITY:
        return await this.handleQuantity(phoneNumber, tenantId, this.parseQuantity(message), messageSid);

      default:
        // Reset on unknown state
        await sessionManager.deleteSession(tenantId, phoneNumber);
        return await this.startFreightQuery(phoneNumber, tenantId);
    }
  }

  /**
   * Start freight query flow.
   */
  private async startFreightQuery(phoneNumber: string, tenantId: string): Promise<string> {
    const session = await sessionManager.getSession(tenantId, phoneNumber);

    if (!session) {
      throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    await sessionManager.updateSession(tenantId, phoneNumber, session);

    return 'Olá! Vou ajudar você a calcular o frete. Qual é o CEP de destino?';
  }

  /**
   * Handle CEP provision.
   */
  private async handleCEP(phoneNumber: string, tenantId: string, cep: string, messageSid?: string): Promise<string> {
    const session = await sessionManager.getSession(tenantId, phoneNumber);

    if (!session) {
      throw new BusinessError(ErrorCode.SESSION_NOT_FOUND, 'Session not found');
    }

    const normalizedCep = this.normalizeCep(cep);
    if (!normalizedCep) {
      return 'CEP inválido. Por favor, envie apenas números (8 dígitos).';
    }

    const newContext = await stateMachine.transition(
      {
        ...session,
        cep: normalizedCep,
      },
      ConversationEvent.CEP_PROVIDED
    );

    await sessionManager.updateSession(tenantId, phoneNumber, newContext);

    return 'CEP recebido! Agora, quantas unidades você deseja?';
  }

  /**
   * Handle quantity provision and calculate freight.
   */
  private async handleQuantity(phoneNumber: string, tenantId: string, quantity: number, messageSid?: string): Promise<string> {
    const session = await sessionManager.getSession(tenantId, phoneNumber);

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

    await sessionManager.updateSession(tenantId, phoneNumber, calculatingContext);

    try {
      // Calculate freight
      const freightRequest: FreightRequest = {
        destinationCep: session.cep,
        quantity,
        tenantId, // pass tenant into domain
      };

      // 1. Metrics Hook: REQUESTED – non-blocking in the domain
      // (kept inside freightService)
      const result = await freightService.calculateFreight(freightRequest);

      // Cleanup session after success
      await sessionManager.deleteSession(tenantId, phoneNumber);

      // Return best option message
      return result.reply;
    } catch (err) {
      logger.warn('legacy.freight.calc_failed', {
        tenantId,
        messageSid: messageSid ? '[present]' : '[missing]',
        name: (err as any)?.name,
        code: (err as any)?.code,
      });

      // Keep session, allow retry
      return 'Não consegui calcular o frete agora. Confirma o CEP e tente novamente.';
    }
  }

  private parseQuantity(input: string): number {
    const v = Number(String(input).replace(/[^\d]/g, ''));
    if (!Number.isFinite(v) || v <= 0) return 1;
    return v;
  }

  private normalizeCep(input: string): string | null {
    const onlyDigits = String(input ?? '').replace(/[^\d]/g, '');
    if (onlyDigits.length !== 8) return null;
    return onlyDigits;
  }
}

export const freightControllerLegacy = new FreightControllerLegacy();