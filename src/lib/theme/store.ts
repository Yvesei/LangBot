import {
  getNextTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type UITheme,
} from '@/lib/config/theme';

const THEME_CHANGE_EVENT = 'langbot-theme-change';

export function getTheme(): UITheme {
  return resolveTheme(document.documentElement.dataset.theme);
}

export function setTheme(theme: UITheme) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The document remains the source of truth when storage is blocked.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function toggleTheme() {
  setTheme(getNextTheme(getTheme()));
}

export function subscribeTheme(onChange: () => void) {
  function onStorage(event: StorageEvent) {
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
