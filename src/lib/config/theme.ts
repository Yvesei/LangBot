export const THEME_STORAGE_KEY = 'langbot-theme';
export const DEFAULT_THEME = 'neo';

export const THEMES = {
  neo: {
    label: 'Neo brutalism',
    shortLabel: 'Neo',
  },
  original: {
    label: 'Original',
    shortLabel: 'Original',
  },
} as const;

export type UITheme = keyof typeof THEMES;

const storedThemes: [string, UITheme][] = [
  ['neo', 'neo'],
  ['original', 'original'],
  ['focus', 'original'],
];
const themeByStoredValue = new Map(storedThemes);

export function resolveTheme(value: string | null | undefined): UITheme {
  return themeByStoredValue.get(value ?? '') ?? DEFAULT_THEME;
}

export function getNextTheme(theme: UITheme): UITheme {
  return theme === 'neo' ? 'original' : 'neo';
}

// Use the same saved-value mapping before React hydrates, without flashing themes.
export const THEME_INIT_SCRIPT = `(() => {
  let theme = ${JSON.stringify(DEFAULT_THEME)};
  try {
    theme = new Map(${JSON.stringify(storedThemes)}).get(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})) ?? theme;
  } catch {}
  document.documentElement.dataset.theme = theme;
})();`;
