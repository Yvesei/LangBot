import { ChatMessage, ChatResponse, ConversationContext } from "../types/index";

/**
 * Send user input to the backend API with conversation history
 * @param userPrompt - The user's input message
 * @param conversationHistory - Previous messages for context
 * @param context - Additional learning context
 * @returns Promise with the AI response
 */
export async function send(
  userPrompt: string, 
  conversationHistory: ChatMessage[] = [],
  context: Partial<ConversationContext> = {}
): Promise<ChatResponse> {
  try {
    // Input validation
    if (!userPrompt?.trim()) {
      throw new Error('Message cannot be empty');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        prompt: userPrompt.trim(),
        history: conversationHistory.slice(-10), 
        context: context
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get response');
    }

    return {
      message: data.message,
      success: true
    };

  } catch (error) {
    console.error('Error sending message:', error);
    
    return {
      message: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}