import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '../../../infra/db';
import {
  METRICS_DAILY_UPSERT_CHUNK_SIZE,
  MetricsDailyRepository,
  type MetricsDailyUpsertRow,
} from '../metrics-daily.repository';

const mockExecute = vi.fn();

vi.mock('../../../infra/db', () => ({
  getDb: vi.fn(),
}));

describe('MetricsDailyRepository.upsertDailyRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    mockExecute.mockResolvedValue([[], []]);
    vi.mocked(getDb).mockResolvedValue({ execute: mockExecute } as never);
  });

  it('upserts in chunks to reduce round trips', async () => {
    const repository = new MetricsDailyRepository();
    const totalRows = (METRICS_DAILY_UPSERT_CHUNK_SIZE * 2) + 1;
    const rows: MetricsDailyUpsertRow[] = Array.from({ length: totalRows }, (_, index) => ({
      tenantId: 'tenant-1',
      dayDate: '2026-02-20',
      utmSource: `source-${index}`,
      utmCampaign: `campaign-${index}`,
      totalEvents: index,
      funnelStarted: index,
      freightSimulations: index,
      consumedTokens: index,
      clickTokens: index,
    }));

    await repository.upsertDailyRows(rows);

    expect(mockExecute).toHaveBeenCalledTimes(Math.ceil(totalRows / METRICS_DAILY_UPSERT_CHUNK_SIZE));
  });
});
