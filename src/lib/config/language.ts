import { LanguageConfig } from '../types/language';

// Store language configuration
let languageConfig: LanguageConfig = {
  nativeLanguage: 'en',
  targetLanguage: 'fr'
};


/**
 * Set the language configuration for the session
 * @param config - Language configuration object
 */
export function setLanguageConfig(config: LanguageConfig): void {
  languageConfig = config;
  console.log('Language configuration updated:', languageConfig);
}

/**
 * Get language configuration from localStorage
 * @returns Language configuration object or null if not set
 */
export function getLanguageConfigFromStorage(): {
  nativeLanguage: string;
  targetLanguage: string;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const native = localStorage.getItem('langbot-native');
  const target = localStorage.getItem('langbot-target');

  if (!native || !target) {
    return null;
  }

  return {
    nativeLanguage: native,
    targetLanguage: target
  };
}

