
/**
 * Correct a user message using the correction API
 * @param content - The message content to correct
 * @returns Promise with the corrected content
 */
export async function correctMessage(
  content: string
): Promise<{ success: boolean; correctedContent?: string; error?: string }> {
  try {
    // Input validation
    if (!content?.trim()) {
      throw new Error('Content cannot be empty');
    }

    const response = await fetch('/api/correct', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: content.trim()
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to correct message');
    }
 
    return {
      correctedContent: data.correctedContent,
      success: true
    };

  } catch (error) {
    console.error('Error correcting message:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}