import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthSessionState } from '../auth/client';
import { languageConfigSchema, type LanguageConfig } from '../schemas/language';
import { getTheme, setTheme, setThemePersistence } from '../theme/store';
import { getLanguageConfigFromStorage, saveLanguageConfigToStorage } from './language';
import { requestSettings, type PreferenceUpdate } from './preferences';
import { DEFAULT_THEME, resolveTheme, THEME_STORAGE_KEY, type UITheme } from './theme';

function useProfileWriter(userId: string | null) {
  const { mutateAsync } = useMutation({
    mutationFn: ({
      signal,
      accountId,
      preferences,
    }: {
      signal: AbortSignal;
      accountId: string;
      preferences: PreferenceUpdate;
    }) =>
      requestSettings(signal, {
        userId: accountId,
        preferences,
      }),
  });
  const scope = useMemo(
    () => ({
      userId,
      pending: {} as PreferenceUpdate,
      queue: Promise.resolve(),
      controller: null as AbortController | null,
    }),
    [userId],
  );
  const current = useRef<typeof scope | null>(scope);
  current.current = scope;
  const [warning, setWarning] = useState({
    scope,
    message: '',
  });

  useEffect(() => {
    current.current = scope;
    return () => {
      current.current = null;
      scope.controller?.abort();
    };
  }, [scope]);

  const save = useCallback(
    (update: PreferenceUpdate) => {
      scope.pending = {
        ...scope.pending,
        ...update,
      };
      scope.queue = scope.queue.then(async () => {
        if (current.current !== scope || !scope.userId) {
          return;
        }
        const preferences = scope.pending;
        if (Object.keys(preferences).length === 0) {
          return;
        }
        scope.pending = {};
        const controller = new AbortController();
        scope.controller = controller;
        try {
          const result = await mutateAsync({
            signal: controller.signal,
            accountId: scope.userId,
            preferences,
          });
          if (result.userId !== scope.userId) {
            throw new Error('Your session changed. Please retry.');
          }
          if (current.current === scope) {
            setWarning({
              scope,
              message: '',
            });
          }
        } catch {
          if (current.current !== scope || controller.signal.aborted) {
            return;
          }
          scope.pending = {
            ...preferences,
            ...scope.pending,
          };
          setWarning({
            scope,
            message: 'Your preferences could not be saved.',
          });
        } finally {
          scope.controller = null;
        }
      });
    },
    [scope, mutateAsync],
  );
  return {
    save,
    warning: warning.scope === scope ? warning.message : '',

    retry: () => save({}),
  };
}

async function loadPreferences(userId: string | null, signal: AbortSignal) {
  const result = await requestSettings(signal);
  if (result.userId !== userId) {
    throw new Error('Your session changed. Please reload your preferences.');
  }
  const pair = languageConfigSchema.safeParse({
    nativeLanguage: result.preferences?.nativeLanguage,
    targetLanguage: result.preferences?.targetLanguage,
  });
  const profileConfig = pair.success ? pair.data : null;
  return {
    config: userId ? profileConfig : getLanguageConfigFromStorage(),
    guestMessageLimit: result.guestMessageLimit,
    theme: userId ? (result.preferences?.theme ?? DEFAULT_THEME) : null,
  };
}

function useLoadedPreferences(
  auth: AuthSessionState,
  themeVersion: React.RefObject<number>,
) {
  const userId = auth.session?.user.id ?? null;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['settings', userId],
    enabled: !auth.isLoading,
    staleTime: 30_000,

    queryFn: async ({ signal }) => {
      const version = themeVersion.current;
      return {
        ...(await loadPreferences(userId, signal)),
        version,
      };
    },
  });
  const guestTheme = useRef(DEFAULT_THEME as ReturnType<typeof getTheme>);
  useEffect(() => {
    guestTheme.current = getTheme();
  }, []);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }
    if (!userId) {
      try {
        guestTheme.current = resolveTheme(
          localStorage.getItem(THEME_STORAGE_KEY) ?? guestTheme.current,
        );
      } catch {
        // Keep the guest appearance captured before loading account preferences.
      }
      setTheme(guestTheme.current, false);
    }
  }, [auth.isLoading, userId]);

  useEffect(() => {
    if (query.data?.theme && query.data.version === themeVersion.current) {
      setTheme(query.data.theme, false);
    }
  }, [query.data, themeVersion]);

  return {
    state: query.data,
    userId,
    error: query.isError ? 'Your settings could not be loaded.' : '',
    ready: Boolean(query.data) && !auth.isLoading,

    retry: () => void query.refetch(),

    setConfig: (config: LanguageConfig) =>
      client.setQueryData(['settings', userId], (previous: typeof query.data) =>
        previous
          ? {
              ...previous,
              config,
            }
          : previous,
      ),
  };
}

export function usePreferences(auth: AuthSessionState) {
  const [guestWarning, setGuestWarning] = useState('');
  const themeVersion = useRef(0);
  const deferredTheme = useRef<UITheme | null>(null);
  const loaded = useLoadedPreferences(auth, themeVersion);
  const { state, userId } = loaded;
  const writer = useProfileWriter(userId);
  const save = writer.save;

  useEffect(() => {
    const persist = (theme: UITheme) => {
      themeVersion.current++;
      if (auth.isLoading) {
        deferredTheme.current = theme;
        return;
      }
      if (userId) {
        save({ theme });
      }
    };
    const cleanup = setThemePersistence(userId || auth.isLoading ? persist : undefined);
    if (deferredTheme.current && !auth.isLoading) {
      const theme = deferredTheme.current;
      deferredTheme.current = null;
      setTheme(theme);
    }
    return cleanup;
  }, [userId, auth.isLoading, save]);

  function setConfig(config: LanguageConfig) {
    loaded.setConfig(config);
    if (userId) {
      writer.save({ languageConfig: config });
      return;
    }
    const saved = saveLanguageConfigToStorage(config);
    setGuestWarning(saved ? '' : 'Language settings could not be saved in this browser.');
  }

  return {
    config: state?.config ?? null,
    setConfig,
    isReady: loaded.ready,
    guestMessageLimit: state?.guestMessageLimit ?? null,
    error: loaded.error,

    retry: loaded.retry,
    warning: userId ? writer.warning : guestWarning,
    retrySave: writer.retry,
  };
}
