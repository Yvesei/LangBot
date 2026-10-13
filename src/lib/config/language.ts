import { languageConfigSchema, type LanguageConfig } from '../schemas';

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

export function saveLanguageConfigToStorage(config: LanguageConfig): boolean {
  const parsed = languageConfigSchema.parse(config);
  try {
    localStorage.setItem('langbot-native', parsed.nativeLanguage);
    localStorage.setItem('langbot-target', parsed.targetLanguage);
    return true;
  } catch {
    return false;
  }
}
