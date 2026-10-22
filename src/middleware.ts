import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/auth/config';

// Refreshes the Supabase session on every navigation so server components and
// route handlers always see valid cookies. Exits immediately in guest-mode
// (auth not configured).

export async function middleware(request: NextRequest) {
  // Guarded API handlers read and refresh the session themselves. Skipping the
  // middleware lookup there avoids a second Supabase Auth request per call.
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const responseCookies: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  const responseHeaders = new Headers();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),

      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        responseCookies.push(...cookiesToSet);
        for (const [name, value] of Object.entries(headers)) {
          responseHeaders.set(name, value);
        }
      },
    },
  });

  await supabase.auth.getUser();
  const response = NextResponse.next({
    request,
    headers: responseHeaders,
  });
  for (const { name, value, options } of responseCookies) {
    response.cookies.set(name, value, options);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and static assets. API handlers refresh their own sessions.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
