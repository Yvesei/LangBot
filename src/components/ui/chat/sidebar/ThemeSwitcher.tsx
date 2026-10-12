'use client';

import { Palette } from 'lucide-react';
import { getNextTheme, THEMES } from '@/lib/config/theme';
import { toggleTheme } from '@/lib/theme/store';
import { useTheme } from '@/lib/theme/useTheme';

export function ThemeSwitcher() {
  const theme = useTheme();
  const actionLabel = `Switch to ${THEMES[getNextTheme(theme)].label} theme`;

  return (
    <button
      type="button"
      className="icon-button theme-switcher"
      onClick={toggleTheme}
      aria-label={actionLabel}
      title={actionLabel}
    >
      <Palette size={20} />
    </button>
  );
}
