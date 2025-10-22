import { LanguageConfig } from '../types/language';

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
  
  console.log('Retrieved language configuration from storage:', { native, target });

  return {
    nativeLanguage: native,
    targetLanguage: target
  };
}


/**
 * Save language configuration to localStorage
 * @param config - Language configuration object
 */
export function saveLanguageConfigToStorage(config: LanguageConfig): void {


  if (config.nativeLanguage === config.targetLanguage) {
    alert('Please select different languages for native and target.');
    return;
  }


  localStorage.setItem('langbot-native', config.nativeLanguage);
  localStorage.setItem('langbot-target', config.targetLanguage);
}

