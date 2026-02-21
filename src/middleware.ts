import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/api/cockpit/:path*'
  ],
};

export async function middleware(req: NextRequest) {
  // Authentication/tenant checks for cockpit are now handled via getSessionUser 
  // in the respective pages and API routes.
  // Rate limiting via Redis has been removed from Edge middleware as requested.

  return NextResponse.next();
}
