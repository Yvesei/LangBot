'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_THEME, type UITheme } from '@/lib/config/theme';
import { getTheme, subscribeTheme } from './store';

export function useTheme() {
  return useSyncExternalStore<UITheme>(subscribeTheme, getTheme, () => DEFAULT_THEME);
}
