import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ALLOW_WITH_COOKIE = new Set([
  '/dashboard',
  '/datasets',
  '/',            // optional: landing
]);

export default withAuth(
  function middleware(req) {
    const { nextUrl, nextauth } = req as unknown as {
      nextUrl: URL;
      nextauth: { token?: any };
    };

    const token = nextauth?.token;
    // For database sessions, the token structure is different
    // Check if we have a valid user ID in the token
    const isAuthed = !!(token?.uid || token?.id || token?.user?.id || token?.sub || token?.email);
    const onboarded = !!token?.onboardingCompleted;

    const path = nextUrl.pathname;
    const bypass = req.cookies.get('av_onb')?.value === '1';

    if (!isAuthed) {
      if (path.startsWith('/auth') || path.startsWith('/public') || path.startsWith('/_next')) {
        return NextResponse.next();
      }
      const url = new URL('/auth/signin', nextUrl);
      url.searchParams.set('callbackUrl', nextUrl.toString());
      return NextResponse.redirect(url);
    }

    // If not onboarded but we have a bypass cookie, allow certain pages.
    if (!onboarded && bypass) {
      for (const allowed of ALLOW_WITH_COOKIE) {
        if (path === allowed || path.startsWith(allowed + '/')) return NextResponse.next();
      }
    }

    // Normal guards
    if (!onboarded && path !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', nextUrl));
    }
    if (onboarded && path === '/onboarding') {
      const url = new URL('/dashboard', nextUrl);
      url.searchParams.set('tour', '1');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: () => true } }
);

export const config = {
  matcher: [], // Disabled for development
};