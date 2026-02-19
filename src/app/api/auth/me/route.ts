import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.headers.get('x-user-id');
  const tenantId = request.headers.get('x-tenant-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');

  // Headers below are trusted because injected by middleware after JWT verification.

  if (!userId || !tenantId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  return NextResponse.json(
    {
      userId,
      email: email ?? null,
      tenantId,
      role: role ?? null,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
