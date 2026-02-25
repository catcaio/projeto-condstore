import { randomBytes, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '../../../../../infra/auth/session';
import { adminAuditLogRepository } from '../../../../../infra/repositories/admin-audit-log.repository';
import { attributionClickRepository } from '../../../../../infra/repositories/attribution-click.repository';
import type { NewAttributionClickRecord } from '../../../../../drizzle/schema';

export const runtime = 'nodejs';

const DEFAULT_SOURCE = 'google';
const DEFAULT_MEDIUM = 'cpc';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_POST_COUNT = 200;

function buildTemplatePath(): string {
  return '/t/{token}?utm_source=google&utm_medium=cpc&utm_campaign={campanha}&utm_content={adgroup}-{ad}&utm_term={keyword}';
}

function buildTrackingPath(input: {
  token: string;
  source: string;
  medium: string;
  campaign?: string | null;
}): string {
  const params = new URLSearchParams({
    utm_source: input.source,
    utm_medium: input.medium,
    utm_campaign: input.campaign ?? '{campanha}',
    utm_content: '{adgroup}-{ad}',
    utm_term: '{keyword}',
  });
  return `/t/${input.token}?${params.toString()}`;
}

function generateToken(): string {
  return randomBytes(12).toString('base64url');
}

async function requireAdminSession(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session?.tenantId) {
    return { ok: false as const, response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }
  if (session.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      count?: number;
      tenantId?: string;
      campaign?: string;
      source?: string;
      medium?: string;
    };

    const count = Number(body.count ?? 0);
    const tenantId = body.tenantId?.trim();
    const campaign = body.campaign?.trim() || null;
    const source = body.source?.trim() || DEFAULT_SOURCE;
    const medium = body.medium?.trim() || DEFAULT_MEDIUM;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (tenantId !== auth.session.tenantId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_POST_COUNT) {
      return NextResponse.json({ error: `count must be an integer between 1 and ${MAX_POST_COUNT}` }, { status: 400 });
    }

    const seen = new Set<string>();
    const rows: NewAttributionClickRecord[] = [];
    const tokens: string[] = [];

    while (rows.length < count) {
      const token = generateToken();
      if (seen.has(token)) continue;
      seen.add(token);
      tokens.push(token);
      rows.push({
        id: randomUUID(),
        token,
        tenantId,
        utmSource: source,
        utmMedium: medium,
        utmCampaign: campaign,
        utmTerm: null,
        utmContent: null,
        clickId: null,
        landingUrl: null,
        userAgentHash: null,
        ipHash: null,
        consumedAt: null,
      });
    }

    await attributionClickRepository.insertMany(rows);
    await adminAuditLogRepository.log({
      tenantId,
      userId: auth.session.sub,
      action: 'attribution.generate_tokens',
      metadata: {
        count,
        campaign,
        source,
        medium,
      },
    });

    return NextResponse.json({
      tenantId,
      count,
      defaults: { source, medium, campaign },
      final_url_template: buildTemplatePath(),
      tokens: tokens.map((token) => ({
        token,
        finalUrl: buildTrackingPath({ token, source, medium, campaign }),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const campaign = request.nextUrl.searchParams.get('campaign');
  const page = Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json({ error: `Invalid limit (1-${MAX_LIMIT})` }, { status: 400 });
  }

  const result = await attributionClickRepository.listByTenant({
    tenantId: auth.session.tenantId,
    campaign,
    page,
    limit,
  });

  return NextResponse.json({
    page,
    limit,
    total: result.total,
    items: result.items.map((row) => ({
      token: row.token,
      tenantId: row.tenantId,
      utmSource: row.utmSource,
      utmMedium: row.utmMedium,
      utmCampaign: row.utmCampaign,
      consumedAt: row.consumedAt,
      createdAt: row.createdAt,
      finalUrl: buildTrackingPath({
        token: row.token,
        source: row.utmSource || DEFAULT_SOURCE,
        medium: row.utmMedium || DEFAULT_MEDIUM,
        campaign: row.utmCampaign || null,
      }),
    })),
    final_url_template: buildTemplatePath(),
  });
}
