import {
  languageConfigSchema,
  levelSchema,
  type LanguageConfig,
  type Level,
} from '../schemas';

export function getLanguageConfigFromStorage(): LanguageConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const parsed = languageConfigSchema.safeParse({
      nativeLanguage: localStorage.getItem('langbot-native'),
      targetLanguage: localStorage.getItem('langbot-target'),
    });
    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function getLevelFromStorage(): Level {
  try {
    return levelSchema.parse(localStorage.getItem('langbot-level'));
  } catch {
    return 'beginner';
  }
}

export function saveLanguageConfigToStorage(
  config: LanguageConfig,
  level: Level,
): boolean {
  const parsed = languageConfigSchema.parse(config);
  try {
    localStorage.setItem('langbot-native', parsed.nativeLanguage);
    localStorage.setItem('langbot-target', parsed.targetLanguage);
    localStorage.setItem('langbot-level', level);
    return true;
  } catch {
    return false;
  }
}
