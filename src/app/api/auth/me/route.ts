import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '../../../../infra/auth/session';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser(request);

  if (!session?.sub || !session?.tenantId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      userId: session.sub,
      email: session.email ?? null,
      tenantId: session.tenantId,
      role: session.role ?? null,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
