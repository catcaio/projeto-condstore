import { NextRequest, NextResponse } from 'next/server';
import { structuredLogger } from '@/infra/log/logger';

const PRICING_DESTINATION_PATH = '/planos/envios';

function buildPricingRedirectUrl(request: NextRequest): URL {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = PRICING_DESTINATION_PATH;
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const redirectUrl = buildPricingRedirectUrl(request);

  structuredLogger.info('public_pricing_redirect', {
    route: request.nextUrl.pathname,
    eventType: 'public_navigation',
    destination: redirectUrl.pathname,
    hasQuery: Boolean(request.nextUrl.search),
  });

  return NextResponse.redirect(redirectUrl, { status: 307 });
}

export async function HEAD(request: NextRequest) {
  return GET(request);
}
