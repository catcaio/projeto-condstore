import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/infra/auth/guards';
import { runTudicoQuery } from '@/modules/tudico';
import type { TudicoToolName } from '@/modules/tudico';

const payloadSchema = z.object({
  query: z.string().min(1),
  tool: z.enum([
    'get_claim_status',
    'compare_hypothesis_versions',
    'fetch_glossary_term',
    'list_open_questions',
    'audit_response_for_extrapolation',
    'map_concept_dependencies',
    'summarize_regime_state',
  ] as [TudicoToolName, ...TudicoToolName[]]).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const sessionResult = await requireSession(request);
  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_payload',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const response = await runTudicoQuery({
    tenantId: sessionResult.session.tenantId,
    query: parsed.data.query,
    tool: parsed.data.tool,
    payload: parsed.data.payload,
  });

  return NextResponse.json(response);
}
