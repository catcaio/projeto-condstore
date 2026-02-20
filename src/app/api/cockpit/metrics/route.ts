
/**
 * GET /api/cockpit/metrics
 *
 * Returns today's operational metrics for the authenticated tenant.
 * Includes Message counts, Simulation counts, and Freight Funnel stats.
 */

import { NextRequest, NextResponse } from 'next/server';
import { messageRepository } from '@/infra/repositories/message.repository'; // Legacy/General
import { inboundMessageRepository } from '@/modules/llm/repositories/message.repository'; // LLM & Funnel
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { redisClient } from '@/infra/redis.client';
import { logger } from '@/infra/logger';

interface CockpitMetrics {
  mensagensHoje: number;
  cotacoesHoje: number;
  pedidosHoje: number;
  erros24h: number;
  funnel?: {
    counts: Record<string, number>;
    conversionRate: string;
    abandoned: number;
  };
  intents?: any;
}

const CACHE_TTL_SECONDS = 30;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get('x-tenant-id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }

  const cacheKey = `cockpit:metrics:${tenantId}`;

  try {
    // Cache read (skip if Redis unavailable)
    if (redisClient.isAvailable()) {
      const cached = await redisClient.get<CockpitMetrics>(cacheKey);
      if (cached) {
        // logger.debug('cockpit/metrics: cache hit', { tenantId });
        return NextResponse.json(cached, {
          status: 200,
          headers: { 'Cache-Control': 'private, max-age=30' },
        });
      }
    }

    // Real DB queries in parallel
    const [msgMetrics, cotacoesHoje, funnelStats, intentStats] = await Promise.all([
      messageRepository.getMetricsToday(tenantId),
      simulationRepository.countToday(tenantId),
      inboundMessageRepository.getFunnelStats(tenantId),
      inboundMessageRepository.getIntentStats() // Note: getIntentStats might not filter by tenantId in current impl, check
    ]);

    // Process Funnel Stats
    const funnelCounts: Record<string, number> = {};
    if (Array.isArray(funnelStats)) {
      funnelStats.forEach((s: any) => {
        funnelCounts[s.stage] = s.count;
      });
    }

    const starts = funnelCounts['INTENT_DETECTED'] || 0;
    const quotes = funnelCounts['QUOTE_SENT'] || 0;
    const conversionRate = starts > 0 ? (quotes / starts) * 100 : 0;
    const abandoned = funnelCounts['ABANDONED'] || 0;

    const payload: CockpitMetrics = {
      mensagensHoje: Number(msgMetrics.total ?? 0),
      cotacoesHoje: Number(cotacoesHoje ?? 0),
      pedidosHoje: 0,
      erros24h: 0,
      funnel: {
        counts: funnelCounts,
        conversionRate: conversionRate.toFixed(1),
        abandoned
      },
      intents: intentStats
    };

    // Cache write (fire-and-forget)
    if (redisClient.isAvailable()) {
      redisClient.set<CockpitMetrics>(cacheKey, payload, CACHE_TTL_SECONDS).catch((err: unknown) => {
        logger.warn('cockpit/metrics: cache write failed', { tenantId }, err as Error);
      });
    }

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    logger.error('cockpit/metrics: unexpected error', error as Error, { tenantId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
