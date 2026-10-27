import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthSessionState } from '../auth/client';
import { DEFAULT_GUEST_MESSAGE_LIMIT } from '../auth/guest-message-limit';
import { languageConfigSchema, type LanguageConfig } from '../schemas/language';
import { getTheme, setTheme, setThemePersistence } from '../theme/store';
import { getLanguageConfigFromStorage, saveLanguageConfigToStorage } from './language';
import { requestSettings, type PreferenceUpdate } from './preferences';
import { DEFAULT_THEME, resolveTheme, THEME_STORAGE_KEY, type UITheme } from './theme';

function useProfileWriter(userId: string | null) {
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
          const result = await requestSettings(controller.signal, {
            userId: scope.userId,
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
    [scope],
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
  revision: number,
  themeVersion: React.RefObject<number>,
) {
  const userId = auth.session?.user.id ?? null;
  const [state, setState] = useState({
    owner: undefined as string | null | undefined,
    ready: false,
    config: null as LanguageConfig | null,
    guestMessageLimit: DEFAULT_GUEST_MESSAGE_LIMIT,
    error: '',
  });
  const guestTheme = useRef(DEFAULT_THEME as ReturnType<typeof getTheme>);
  useEffect(() => {
    guestTheme.current = getTheme();
  }, []);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    const version = themeVersion.current;
    setState((previous) => ({
      ...previous,
      owner: userId,
      ready: false,
      error: '',
    }));
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
    if (!auth.isConfigured) {
      setState({
        owner: userId,
        ready: true,
        config: getLanguageConfigFromStorage(),
        guestMessageLimit: DEFAULT_GUEST_MESSAGE_LIMIT,
        error: '',
      });
      return;
    }
    void loadPreferences(userId, controller.signal)
      .then((settings) => {
        if (!active) {
          return;
        }
        setState({
          ...settings,
          owner: userId,
          ready: true,
          error: '',
        });
        if (settings.theme && version === themeVersion.current) {
          setTheme(settings.theme, false);
        }
      })
      .catch(() => {
        if (active) {
          setState((previous) => ({
            ...previous,
            ready: false,
            error: 'Your settings could not be loaded.',
          }));
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [auth.isLoading, auth.isConfigured, userId, revision, themeVersion]);

  return {
    state,
    setState,
    userId,
  };
}

export function usePreferences(auth: AuthSessionState) {
  const [revision, setRevision] = useState(0);
  const [guestWarning, setGuestWarning] = useState('');
  const themeVersion = useRef(0);
  const deferredTheme = useRef<UITheme | null>(null);
  const { state, setState, userId } = useLoadedPreferences(auth, revision, themeVersion);
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
    setState((previous) => ({
      ...previous,
      config,
    }));
    if (userId) {
      writer.save({ languageConfig: config });
      return;
    }
    const saved = saveLanguageConfigToStorage(config);
    setGuestWarning(saved ? '' : 'Language settings could not be saved in this browser.');
  }

  return {
    config: state.owner === userId ? state.config : null,
    setConfig,
    isReady: state.owner === userId && state.ready && !auth.isLoading,
    guestMessageLimit: state.guestMessageLimit,
    error: state.error,

    retry: () => setRevision((value) => value + 1),
    warning: userId ? writer.warning : guestWarning,
    retrySave: writer.retry,
  };
}
