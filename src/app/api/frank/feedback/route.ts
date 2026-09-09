/**
 * POST /api/frank/feedback
 *
 * Registers the operator's decision on a suggestion (accepted/rejected/
 * dismissed/expired). tenantId comes from the request header injected by the
 * global JWT middleware — NEVER from the body.
 *
 * Body: { suggestionId: string, outcome: 'accepted'|'rejected'|'dismissed'|'expired' }
 *
 * Persistence: Drizzle/MySQL (frank_feedbacks); tenant-scoped, fails closed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { assertFeedbackOutcome, type FrankFeedbackOutcome } from '@/modules/frank/intelligence/frank-intelligence.types';
import { DrizzleIntelligenceStore } from '@/modules/frank/intelligence/frank-intelligence.repository';
import { FrankIntelligenceService } from '@/modules/frank/intelligence/frank-intelligence.service';
import { DrizzleTenantPreferencesStore } from '@/modules/frank/intelligence/frank-intelligence.preferences';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }

  let body: { suggestionId?: unknown; outcome?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const suggestionId = body.suggestionId;
  const outcome = body.outcome;
  if (typeof suggestionId !== 'string' || !suggestionId) {
    return NextResponse.json({ error: 'suggestionId is required' }, { status: 400 });
  }
  if (typeof outcome !== 'string') {
    return NextResponse.json({ error: 'outcome is required' }, { status: 400 });
  }

  try {
    assertFeedbackOutcome(outcome);
  } catch {
    return NextResponse.json({ error: `invalid outcome: ${outcome}` }, { status: 400 });
  }

  try {
    const store = new DrizzleIntelligenceStore();
    const prefs = new DrizzleTenantPreferencesStore();
    const service = new FrankIntelligenceService(store, prefs, []);
    const feedback = await service.recordFeedback({
      tenantId,
      suggestionId,
      outcome: outcome as FrankFeedbackOutcome,
    });
    return NextResponse.json({ ok: true, feedback }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      error instanceof Error && (error.name === 'UnknownSuggestionError' || error.name === 'TenantMismatchError') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}