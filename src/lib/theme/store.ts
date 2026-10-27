import {
  getNextTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type UITheme,
} from '@/lib/config/theme';

const THEME_CHANGE_EVENT = 'languify-theme-change';
let persistTheme: ((theme: UITheme) => void) | undefined;

export function setThemePersistence(writer?: (theme: UITheme) => void) {
  persistTheme = writer;
  return () => {
    if (persistTheme === writer) {
      persistTheme = undefined;
    }
  };
}

export function getTheme(): UITheme {
  return resolveTheme(document.documentElement.dataset.theme);
}

export function setTheme(theme: UITheme, persist = true) {
  document.documentElement.dataset.theme = theme;

  if (persist && persistTheme) {
    persistTheme(theme);
  }
  if (persist && !persistTheme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The document remains the source of truth when storage is blocked.
    }
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function toggleTheme() {
  setTheme(getNextTheme(getTheme()));
}

export function subscribeTheme(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (persistTheme) {
      return;
    }
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) {
      return;
    }

    document.documentElement.dataset.theme = resolveTheme(event.newValue);
    onChange();
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
