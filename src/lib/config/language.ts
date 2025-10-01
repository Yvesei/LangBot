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
 * Get the current language configuration
 * @returns Current language configuration
 */
export function getLanguageConfig(): LanguageConfig {
  return languageConfig;
}
