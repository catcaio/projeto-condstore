import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiDecisionLogRepository } from '../ai-decision-log.repository';

const mockDb = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../db', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock('../../logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('AiDecisionLogRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a decision log with provided payload', async () => {
    const repository = new AiDecisionLogRepository();

    await repository.saveDecisionLog({
      tenantId: 'tenant-1',
      messageId: 'SM123',
      providerEventId: 'SM123',
      provider: 'intent_classifier',
      model: 'rules-v1',
      intent: 'FREIGHT_QUERY',
      confidence: 0.9,
      toolUsed: null,
      toolPayload: null,
      tokensIn: 10,
      tokensOut: 20,
      latencyMs: 120,
      responseType: 'twiml_ok',
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      messageId: 'SM123',
      providerEventId: 'SM123',
      provider: 'intent_classifier',
      model: 'rules-v1',
      intent: 'FREIGHT_QUERY',
      confidence: 0.9,
      tokensIn: 10,
      tokensOut: 20,
      latencyMs: 120,
      responseType: 'twiml_ok',
      id: expect.any(String),
    }));
  });
});
