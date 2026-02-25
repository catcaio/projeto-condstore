import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runRetentionCleanup } from '../retention-cleanup.service';
import { getDb } from '../../../infra/db';
import { getDataRetentionPolicy } from '../../../infra/config/data-retention';

const mockExecute = vi.fn();

vi.mock('../../../infra/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('../../../infra/config/data-retention', () => ({
  getDataRetentionPolicy: vi.fn(),
}));

vi.mock('../../../infra/log/logger', () => ({
  structuredLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('retention-cleanup.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
    vi.mocked(getDataRetentionPolicy).mockReturnValue({
      publicEventsDays: 180,
      funnelDays: 180,
      freightLogsDays: 180,
      attributionClicksDays: 365,
      dedupDays: 30,
    });
  });

  it('deletes in batches and returns per-table totals', async () => {
    mockExecute
      .mockResolvedValueOnce([{ affectedRows: 5000 }]) // public_events batch 1 (old)
      .mockResolvedValueOnce([{ affectedRows: 2 }]) // public_events batch 2 (remaining old, new stays)
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // freight_funnel_events
      .mockResolvedValueOnce([{ affectedRows: 0 }]) // freight_simulation_logs
      .mockResolvedValueOnce([{ affectedRows: 4 }]) // attribution_clicks
      .mockResolvedValueOnce([{ affectedRows: 3 }]); // inbound_message_dedup

    const result = await runRetentionCleanup({
      requestId: 'req-cleanup-1',
      now: new Date('2026-02-25T00:00:00.000Z'),
    });

    expect(result.totalDeleted).toBe(5010);
    expect(result.tables).toEqual([
      expect.objectContaining({ table: 'public_events', deletedCount: 5002 }),
      expect.objectContaining({ table: 'freight_funnel_events', deletedCount: 1 }),
      expect.objectContaining({ table: 'freight_simulation_logs', deletedCount: 0 }),
      expect.objectContaining({ table: 'attribution_clicks', deletedCount: 4 }),
      expect.objectContaining({ table: 'inbound_message_dedup', deletedCount: 3 }),
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(6);
  });
});
