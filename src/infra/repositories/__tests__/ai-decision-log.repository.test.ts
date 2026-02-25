import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiDecisionLogRepository } from '../ai-decision-log.repository';

const mockDb = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
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
    mockDb.values.mockResolvedValue(undefined);
    mockDb.limit.mockResolvedValue([]);
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
      confidence: '0.9000',
      toolUsed: null,
      toolPayload: null,
      tokensIn: 10,
      tokensOut: 20,
      latencyMs: 120,
      responseType: 'twiml_ok',
      id: expect.any(String),
    }));
  });

  it('lists recent logs scoped by tenant and keeps DB ordering (newest first)', async () => {
    const repository = new AiDecisionLogRepository();
    const newest = new Date('2026-02-25T12:00:00.000Z');
    const older = new Date('2026-02-25T11:00:00.000Z');

    mockDb.limit.mockResolvedValueOnce([
      {
        id: 'log-2',
        tenantId: 'tenant-1',
        messageId: 'SM2',
        providerEventId: 'EVT2',
        provider: 'intent_classifier',
        model: 'rules-v1',
        intent: 'UNKNOWN',
        confidence: '0.1200',
        toolUsed: null,
        toolPayload: null,
        tokensIn: 3,
        tokensOut: 4,
        latencyMs: 33,
        responseType: 'twiml_ok',
        createdAt: newest,
      },
      {
        id: 'log-1',
        tenantId: 'tenant-1',
        messageId: 'SM1',
        providerEventId: 'EVT1',
        provider: 'intent_classifier',
        model: 'rules-v1',
        intent: 'FREIGHT_QUERY',
        confidence: '0.9500',
        toolUsed: null,
        toolPayload: null,
        tokensIn: 1,
        tokensOut: 2,
        latencyMs: 22,
        responseType: 'twiml_ok',
        createdAt: older,
      },
    ]);

    const result = await repository.listRecentByTenant('tenant-1', 2);

    expect(mockDb.select).toHaveBeenCalledTimes(1);
    expect(mockDb.where).toHaveBeenCalledTimes(1);
    expect(mockDb.orderBy).toHaveBeenCalledTimes(1);
    expect(mockDb.limit).toHaveBeenCalledWith(2);
    expect(result.map((row) => row.id)).toEqual(['log-2', 'log-1']);
    expect(result[0].tenantId).toBe('tenant-1');
    expect(result[0].confidence).toBe(0.12);
    expect(result[0].createdAt).toBe(newest.toISOString());
    expect(result[1].createdAt).toBe(older.toISOString());
  });

  it('returns empty list without querying when tenantId is missing', async () => {
    const repository = new AiDecisionLogRepository();

    const result = await repository.listRecentByTenant('', 10);

    expect(result).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
