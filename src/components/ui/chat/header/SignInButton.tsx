import { useEffect, useState } from 'react';

import { GoogleMark } from '@/components/ui/brand/GoogleMark';
import { getSupabaseBrowserClient } from '@/lib/auth/browser';

interface SignInButtonProps {
  variant?: 'icon' | 'call-to-action';
}

function clearCallbackError() {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete('auth_error');
  window.history.replaceState(
    window.history.state,
    '',
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
  );
}

export function SignInButton({ variant = 'icon' }: SignInButtonProps) {
  const isCallToAction = variant === 'call-to-action';
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function restoreSignIn(event: PageTransitionEvent) {
      if (event.persisted) {
        setIsPending(false);
      }
    }

    window.addEventListener('pageshow', restoreSignIn);
    return () => window.removeEventListener('pageshow', restoreSignIn);
  }, []);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('auth_error') !== '1') {
      return;
    }

    setError('Google sign-in did not finish. Please try again.');
  }, []);

  async function signInWithGoogle() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError('Sign-in is not configured.');
      return;
    }

    setError(null);
    clearCallbackError();
    setIsPending(true);

    try {
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });

      if (authError) {
        setError('Could not start Google sign-in. Please try again.');
        setIsPending(false);
      }
    } catch {
      setError('Could not start Google sign-in. Please try again.');
      setIsPending(false);
    }
  }

  return (
    <div className={isCallToAction ? 'guest-limit-auth-entry' : 'auth-menu-entry'}>
      <button
        type="button"
        onClick={signInWithGoogle}
        className={isCallToAction ? 'guest-limit-auth-button' : 'icon-button'}
        aria-label={isCallToAction ? undefined : 'Sign in with Google'}
        aria-busy={isPending}
        disabled={isPending}
        title={isCallToAction ? undefined : 'Sign in with Google'}
        autoFocus={isCallToAction}
      >
        <GoogleMark />
        {isCallToAction && <span>Continue with Google</span>}
      </button>
      {error && (
        <span
          className="auth-menu-error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
