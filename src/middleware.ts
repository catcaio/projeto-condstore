import { NextRequest, NextResponse } from "next/server";
import { verify } from './lib/auth/jwt';

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/api/cockpit/:path*',
    '/app/:path*', // Catch-all for app namespace including premium
    '/admin/:path*'
  ],
};

export async function middleware(req: NextRequest) {
  // Authentication/tenant checks for cockpit are now handled via getSessionUser 
  // in the respective pages and API routes.
  // Rate limiting via Redis has been removed from Edge middleware as requested.

  // Authentication for /app
  const sessionCookie = req.cookies.get('session');
  let decodedUser: any = null;
  if (sessionCookie) {
    decodedUser = verify(sessionCookie.value);
  }

  const res = NextResponse.next();

  if (decodedUser && decodedUser.userId) {
    res.headers.set('x-user-id', decodedUser.userId);
  }

  // General auth gateway for /app
  if (req.nextUrl.pathname.startsWith('/app') && !req.nextUrl.pathname.startsWith('/app/premium')) {
    if (!decodedUser) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Placeholder governance check for premium features via AccessGate synchronization
  if (req.nextUrl.pathname.startsWith('/app/premium')) {
    if (!decodedUser) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
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
