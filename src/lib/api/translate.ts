import { getLanguageConfig } from '../config/language';

/**
 * Translate a message using the translation API
 * @param content - The message content to translate
 * @returns Promise with the translated content
 */
export async function translateMessage(
  content: string
): Promise<{ success: boolean; translation?: string; error?: string }> {
  try {
    // Input validation
    if (!content?.trim()) {
      throw new Error('Content cannot be empty');
    }

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: content.trim(),
        languageConfig: getLanguageConfig()
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to translate message');
    }

    return {
      translation: data.translation,
      success: true
    };

  } catch (error) {
    console.error('Error translating message:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}