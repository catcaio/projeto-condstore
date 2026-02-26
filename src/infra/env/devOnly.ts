import { NextResponse } from 'next/server';

export function isDevRuntime(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
}

export function assertDevOnly(requestId?: string): NextResponse | undefined {
  if (!isDevRuntime()) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'This endpoint is available in development mode only',
        requestId: requestId || 'dev-check'
      },
      { status: 403 }
    );
  }
  return undefined;
}
