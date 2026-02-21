/**
 * GET /api/cockpit/metrics
 *
 * Returns today's operational metrics for the authenticated tenant.
 * Requires `x-tenant-id` header (injected server-side by the global JWT middleware).
 *
 * Response shape (all fields always present, always integers):
 *   { mensagensHoje: number, cotacoesHoje: number, pedidosHoje: number, erros24h: number }
 *
 * Cache: Redis key `cockpit:metrics:{tenantId}` TTL 30s (when Redis is available).
 */

import { NextRequest, NextResponse } from 'next/server';
import { messageRepository } from '@/infra/repositories/message.repository';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { redisClient } from "@/infra/redis.client";
import { logger } from '@/infra/logger';

interface CockpitMetrics {
  mensagensHoje: number;
  cotacoesHoje: number;
  pedidosHoje: number;
  erros24h: number;
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
        logger.debug('cockpit/metrics: cache hit', { tenantId });
        return NextResponse.json(cached, {
          status: 200,
          headers: { 'Cache-Control': 'private, max-age=30' },
        });
      }
    }

    // Real DB queries in parallel (tenant-isolated)
    const [msgMetrics, cotacoesHoje] = await Promise.all([
      messageRepository.getMetricsToday(tenantId),
      simulationRepository.countToday(tenantId),
    ]);

    const payload: CockpitMetrics = {
      mensagensHoje: Number(msgMetrics.total ?? 0),
      cotacoesHoje: Number(cotacoesHoje ?? 0),
      pedidosHoje: 0, // TODO: orders table
      erros24h: 0,    // TODO: error_log table
    };

    // Cache write (fire-and-forget)
    if (redisClient.isAvailable()) {
      redisClient.set<CockpitMetrics>(cacheKey, payload, CACHE_TTL_SECONDS).catch((err: unknown) => {
        logger.warn('cockpit/metrics: cache write failed', { tenantId }, err as Error);
      });
    }

    logger.info('cockpit/metrics: served', {
      tenantId,
      mensagensHoje: payload.mensagensHoje,
      cotacoesHoje: payload.cotacoesHoje,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    logger.error('cockpit/metrics: unexpected error', error as Error, { tenantId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
