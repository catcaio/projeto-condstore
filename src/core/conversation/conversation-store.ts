/**
 * Conversation State Store.
 * Persists minimal conversation state in Redis for multi-turn WhatsApp flows.
 *
 * Key format: conv:{tenantId}:{normalizedFrom}
 * TTL: 7 days (604800s)
 */

import { redisClient } from '../../infra/redis.client';
import { logger } from '../../infra/logger';

/** 7 days in seconds. */
const CONVERSATION_TTL_SECONDS = 604_800;

/**
 * Minimal data collected across the conversation turns.
 */
export interface CollectedData {
  productId?: string;
  qty?: number;
  cep?: string;
}

/**
 * Persisted conversation state — intentionally small.
 */
export interface ConversationStateData {
  currentState: string;
  collectedData: CollectedData;
}

const DEFAULT_STATE: ConversationStateData = {
  currentState: 'IDLE',
  collectedData: {},
};

/**
 * Build the deterministic Redis key for a conversation.
 * `from` should already be normalised (e.g. "whatsapp:+5511999990000").
 */
function buildKey(tenantId: string, from: string): string {
  return `conv:${tenantId}:${from}`;
}

/**
 * Mask a phone / whatsapp identifier for safe logging.
 * "whatsapp:+5511999990000" → "whatsapp:+55***0000"
 */
export function maskFrom(from: string): string {
  // Keep prefix up to country code (2–3 digits after +) and last 4 digits
  const match = from.match(/^(whatsapp:\+\d{2,3})(.*)(\d{4})$/);
  if (match) {
    return `${match[1]}***${match[3]}`;
  }
  // Fallback: keep last 4 chars
  if (from.length > 4) {
    return '***' + from.slice(-4);
  }
  return '****';
}

/**
 * Load conversation state from Redis.
 * Returns the default IDLE state when no state exists or Redis is down.
 */
export async function loadConversation(
  tenantId: string,
  from: string,
): Promise<ConversationStateData> {
  const key = buildKey(tenantId, from);

  try {
    const stored = await redisClient.get<ConversationStateData>(key);
    if (stored) {
      logger.debug('Conversation state loaded', {
        key,
        currentState: stored.currentState,
      });
      return stored;
    }
  } catch (err) {
    logger.warn('Failed to load conversation state, using default', { key }, err as Error);
  }

  return { ...DEFAULT_STATE, collectedData: {} };
}

/**
 * Save conversation state to Redis with 7-day TTL.
 */
export async function saveConversation(
  tenantId: string,
  from: string,
  state: ConversationStateData,
): Promise<void> {
  const key = buildKey(tenantId, from);

  try {
    await redisClient.set(key, state, CONVERSATION_TTL_SECONDS);
    logger.debug('Conversation state saved', {
      key,
      currentState: state.currentState,
    });
  } catch (err) {
    logger.error('Failed to save conversation state', err as Error, { key });
  }
}
