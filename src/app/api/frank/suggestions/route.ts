/**
 * GET /api/frank/suggestions?surface=queue|active_context|pulse
 *
 * Generates and returns traceable Frank suggestions for one Cockpit surface.
 * tenantId from request header (JWT middleware), never from the body.
 *
 * Deterministic evaluators only (no LLM in this PR, per the FRK-8 decision);
 * suggestions carry mandatory `reason` (explainability) and are persisted so
 * they can be audited and fed back via POST /api/frank/feedback.
 *
 * Response: { suggestions: FrankSuggestion[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { assertSurface, type FrankSurface } from '@/modules/frank/intelligence/frank-intelligence.types';
import { DrizzleIntelligenceStore } from '@/modules/frank/intelligence/frank-intelligence.repository';
import { DrizzleTenantPreferencesStore } from '@/modules/frank/intelligence/frank-intelligence.preferences';
import { FrankIntelligenceService } from '@/modules/frank/intelligence/frank-intelligence.service';
import { ALL_EVALUATORS } from '@/modules/frank/intelligence/frank-intelligence.evaluators';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }

  const surfaceParam = request.nextUrl.searchParams.get('surface') ?? 'queue';
  let surface: FrankSurface;
  try {
    surface = assertSurface(surfaceParam);
  } catch {
    return NextResponse.json({ error: `invalid surface: ${surfaceParam}` }, { status: 400 });
  }

  try {
    const store = new DrizzleIntelligenceStore();
    const prefs = new DrizzleTenantPreferencesStore();
    const service = new FrankIntelligenceService(store, prefs, ALL_EVALUATORS);

    // TODO(FRK-8+): the Cockpit surfaces (queue / active context / pulse)
    // will pass real tenant-scoped signals here. For now the evaluators run
    // with empty signals, which yields no suggestions — the contract is
    // exercised end-to-end by the integration tests (unidade + Drizzle real).
    const suggestions = await service.generateSuggestions({ tenantId, surface, signals: {} });
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}