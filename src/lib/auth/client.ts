import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
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
  retry?: () => void;
}

const AuthContext = createContext<AuthSessionState | null>(null);
let anonymousRequest: ReturnType<SupabaseClient['auth']['signInAnonymously']> | null =
  null;

function signInAsGuest(client: SupabaseClient) {
  if (!anonymousRequest) {
    anonymousRequest = client.auth.signInAnonymously().finally(() => {
      anonymousRequest = null;
    });
  }
  return anonymousRequest;
}

function useSessionState(): AuthSessionState {
  const isConfigured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError('Could not start your chat session. Please retry.');
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
        const { data, error: signInError } = await signInAsGuest(browserClient);
        if (!active) {
          return;
        }
        setSession(data.session);
        setError(
          signInError || !data.session
            ? 'Could not start your chat session. Please retry.'
            : '',
        );
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
    } = browserClient.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        if (nextSession) {
          setActiveSession(nextSession);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => void createAnonymousSession(), 0);
        }
      }
    });

    browserClient.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (active) {
          if (sessionError) {
            throw sessionError;
          }
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
  }, [revision]);

  return {
    session,
    isLoading,
    isAnonymous: Boolean(session?.user.is_anonymous),
    error,

    retry: () => {
      setError('');
      setIsLoading(true);
      setRevision((value) => value + 1);
    },
  };
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionState();
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuthSession(): AuthSessionState {
  const session = useContext(AuthContext);
  if (!session) {
    throw new Error('AuthSessionProvider is missing.');
  }
  return session;
}
