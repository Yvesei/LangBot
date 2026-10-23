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
  isConfigured: boolean;
}

/** Tracks both session restoration and sign-in changes for the current browser. */
export function useAuthSession(): AuthSessionState {
  const isConfigured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    let active = true;
    let authChanged = false;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        authChanged = true;
        setSession(nextSession);
        setIsLoading(false);
      }
    });

    client.auth
      .getSession()
      .then(({ data }) => {
        if (active && !authChanged) {
          setSession(data.session);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active && !authChanged) {
          setSession(null);
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
    isConfigured,
  };
}
