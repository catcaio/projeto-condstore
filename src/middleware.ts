import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/api/cockpit/:path*'
  ],
};

export async function middleware(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing tenant id" },
      { status: 400 }
    );
  }

  // Authentication/tenant checks for cockpit can go here.
  // Rate limiting via Redis has been removed from Edge middleware as requested.

  return NextResponse.next();
}
