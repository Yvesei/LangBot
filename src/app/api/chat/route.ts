import { NextRequest, NextResponse } from 'next/server';
import { ChatRequest, MistralMessage } from '@/lib/types';



const LANGUAGE_LEARNING_PROMPTS = {
  system: `You are an expert language learning tutor and conversation partner. Your role is to:

TEACHING APPROACH:
- Help users practice their target language through natural conversation
- Ask follow-up questions to keep the conversation engaging
- Adjust your language complexity based on the user's level
- Encourage them to express themselves, even if imperfect
- Provide gentle language corrections when they make mistakes, but don't interrupt the flow - the correction should be strictly about language use, not content. 


CORRECTION STYLE:
- DO NOT CORRECT THE USER, EVER.

CONVERSATION TOPICS:
- Daily activities and routines
- Hobbies and interests  
- Travel and culture
- Food and restaurants
- Work and studies
- Current events (appropriate level)

Be patient, encouraging, and make learning feel natural and enjoyable.`,

  conversationStarters: [
    "What did you do today?",
    "Tell me about your favorite hobby.",
    "What's your favorite type of food?",
    "Where would you like to travel?",
    "What are you studying or working on?"
  ]
};

/**
 * Create a contextual system prompt based on conversation history and user context
 */
function createContextualPrompt(context: ChatRequest['context'] = {}) {
  let contextualPrompt = LANGUAGE_LEARNING_PROMPTS.system;
  
  const { learningLanguage, userLevel, topicsDiscussed, commonMistakes } = context;
  
  // Add language-specific context
  if (learningLanguage && learningLanguage !== 'English') {
    contextualPrompt += `\n\nThe user is learning ${learningLanguage}. Please help them practice ${learningLanguage} and provide translations when helpful.`;
  }
  
  // Add level-specific context
  if (userLevel) {
    contextualPrompt += `\n\nThe user's proficiency level is: ${userLevel}. Adjust your language complexity accordingly.`;
  }
  
  // Add topics context
  if (topicsDiscussed && topicsDiscussed.length > 0) {
    contextualPrompt += `\n\nIn this conversation, you've discussed: ${topicsDiscussed.join(', ')}. You can reference these topics naturally.`;
  }
  
  // Add common mistakes context
  if (commonMistakes && commonMistakes.length > 0) {
    contextualPrompt += `\n\nThe user has made these types of mistakes before: ${commonMistakes.slice(0, 3).join(', ')}. Be mindful of these patterns and gently correct similar errors.`;
  }
  
  return contextualPrompt;
}

export async function POST(request: NextRequest) {
  try {
    let body: ChatRequest;

    try {
      // Try to parse JSON
      body = await request.json();
    } catch (err) {
      // If parsing fails, return 400
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }
    
    const { prompt, history = [], context = {} } = body;

    // Input validation
    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.error('MISTRAL_API_KEY not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Prepare messages for Mistral API with language learning context
    const messages: MistralMessage[] = [
      {
        role: 'system',
        content: createContextualPrompt(context)
      },
      // Add conversation history (last 8 messages to stay within token limits)
      ...history.slice(-8).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt.trim()
      }
    ];

    console.log(messages)
    // Call Mistral API
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Mistral API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: response.status === 401 
            ? 'API authentication failed' 
            : 'AI service temporarily unavailable' 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract the AI response
    const aiMessage = data.choices?.[0]?.message?.content;
    
    if (!aiMessage) {
      console.error('Invalid response format from Mistral API:', data);
      return NextResponse.json(
        { success: false, error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      message: aiMessage.trim(),
    });

  } catch (error) {
    console.error('API route error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}