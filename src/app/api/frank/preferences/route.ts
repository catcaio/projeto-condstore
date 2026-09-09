/**
 * GET/PUT /api/frank/preferences
 *
 * Per-tenant operator preferences: which suggestion types are disabled and
 * the minimum confidence cutoff. tenantId from request header (JWT
 * middleware), never from the body.
 *
 * GET  -> { tenantId, disabledTypes: string[], minConfidence: number }
 * PUT  -> body { disabledTypes?: string[], minConfidence?: number }
 *
 * Persistence: Drizzle/MySQL (frank_preferences); tenant-scoped, fails closed.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { FrankSuggestionType } from '@/modules/frank/intelligence/frank-intelligence.types';
import { DrizzleTenantPreferencesStore } from '@/modules/frank/intelligence/frank-intelligence.preferences';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }
  try {
    const prefs = new DrizzleTenantPreferencesStore();
    const current = await prefs.getPreferences(tenantId);
    return NextResponse.json(current, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
  }

  let body: { disabledTypes?: unknown; minConfidence?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const disabledTypes: FrankSuggestionType[] | undefined =
    Array.isArray(body.disabledTypes) ? (body.disabledTypes as FrankSuggestionType[]) : undefined;
  const minConfidence =
    typeof body.minConfidence === 'number' ? body.minConfidence : undefined;

  try {
    const prefs = new DrizzleTenantPreferencesStore();
    const next = await prefs.setPreferences(tenantId, { disabledTypes, minConfidence });
    return NextResponse.json(next, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'invalid preferences payload or unavailable store' }, { status: 400 });
  }
}