import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from './browser';
import { isSupabaseConfigured } from './config';

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
