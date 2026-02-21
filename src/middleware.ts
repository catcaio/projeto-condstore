import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/api/cockpit/:path*',
    '/app/premium/:path*', // Minimal governance skeleton
    '/admin/:path*'
  ],
};

export async function middleware(req: NextRequest) {
  // Authentication/tenant checks for cockpit are now handled via getSessionUser 
  // in the respective pages and API routes.
  // Rate limiting via Redis has been removed from Edge middleware as requested.

  // Placeholder governance check for premium features via AccessGate synchronization
  if (req.nextUrl.pathname.startsWith('/app/premium')) {
    const entitled = req.cookies.get('entitled');
    if (entitled?.value !== '1') {
      return NextResponse.redirect(new URL('/pricing?blocked=1', req.url));
    }
  }

  // Admin routing protection
  if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
    const isAdmin = req.cookies.get('admin');
    if (isAdmin?.value !== '1') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return NextResponse.next();
}
