import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@/lib/auth/server';

// OAuth redirect target: exchanges the Google authorization code for the
// session cookies, then sends the user back to the app.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || searchParams.has('error')) {
    return redirectToApp(true);
  }

  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return redirectToApp(true);
    }

    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToApp(true);
    }

    return redirectToApp();
  } catch {
    return redirectToApp(true);
  }
}

function redirectToApp(authError = false) {
  // A relative Location keeps the browser's public origin when Next.js sees an
  // internal host behind a proxy, without trusting forwarded host headers.
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: authError ? '/?auth_error=1' : '/',
      'Cache-Control': 'private, no-store',
      Expires: '0',
      Pragma: 'no-cache',
    },
  });
}
