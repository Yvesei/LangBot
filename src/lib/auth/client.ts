import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // createBrowserClient caches its instance, so repeated calls stay cheap.
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

export interface AuthSessionState {
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  error: string;
}

/** Tracks both session restoration and sign-in changes for the current browser. */
export function useAuthSession(): AuthSessionState {
  const isConfigured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setIsLoading(false);
      return;
    }
    const browserClient = client;

    let active = true;
    let creatingAnonymousSession = false;

    function setActiveSession(nextSession: Session | null) {
      setSession(nextSession);
      setError('');
      setIsLoading(false);
    }

    async function createAnonymousSession() {
      if (!active || creatingAnonymousSession) {
        return;
      }
      creatingAnonymousSession = true;
      try {
        const { data, error: signInError } = await browserClient.auth.signInAnonymously();
        if (!active) {
          return;
        }
        setSession(data.session);
        setError(signInError ? 'Could not start your chat session. Please retry.' : '');
        setIsLoading(false);
      } catch {
        if (active) {
          setSession(null);
          setError('Could not start your chat session. Please retry.');
          setIsLoading(false);
        }
      } finally {
        creatingAnonymousSession = false;
      }
    }

    const {
      data: { subscription },
    } = browserClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        if (nextSession) {
          setActiveSession(nextSession);
        } else {
          void createAnonymousSession();
        }
      }
    });

    browserClient.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          if (data.session) {
            setActiveSession(data.session);
          } else {
            void createAnonymousSession();
          }
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setError('Could not restore your chat session. Please retry.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    isLoading,
    isAnonymous: Boolean(session?.user.is_anonymous),
    error,
  };
}
