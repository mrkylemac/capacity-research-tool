import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * First line of defence only.
 *
 * This runs on the edge and just checks that a session cookie is present — it
 * does not validate the session or check approval, because that needs a
 * database read. Every protected page calls `requireApprovedUser()` and every
 * protected route handler calls `requireApprovedUserForApi()`; those are the
 * real gate. This middleware exists to bounce signed-out visitors to the login
 * form without paying for a render.
 */
const PUBLIC_PATHS = ['/login', '/signup', '/pending'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Send the visitor back where they were headed once they sign in.
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Pages only. Excluded:
     *  - /api/*     route handlers guard themselves and must answer with a
     *               JSON 401/403 — redirecting an API call to an HTML login
     *               page just hands the caller a confusing 200
     *  - /_next/*   build output
     *  - static assets at the root (favicon.svg, images, fonts, ...)
     */
    '/((?!api/|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)',
  ],
};
