import { NextRequest, NextResponse } from 'next/server';
import { LanguageConfig } from '@/lib/types/index';
import { fetchWithRetry } from '@/lib/utils';

function SysTranslatePrompt(languageConfig: LanguageConfig){
  return `You are a translator, you speacialize in ${languageConfig.targetLanguage} to ${languageConfig.nativeLanguage}. Translate the user's text  exactly and reply ONLY with the translated text — no explanations, no extra commentary, keep the same format of the text.`
}

// Minimal request body type
type Body = {
  content: string;
  languageConfig: LanguageConfig;
};

export async function POST(request: NextRequest) {
  try {

    let body: Body;

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
    
    const content = body?.content?.trim();
    const languageConfig = body?.languageConfig;
    console.log(languageConfig)


    if (!content) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.error('MISTRAL_API_KEY not found');
      return NextResponse.json({ success: false, error: 'API configuration error' }, { status: 500 });
    }

    const messages = [
      { role: 'system', content: SysTranslatePrompt(languageConfig) },
      { role: 'user', content: content }
    ];

    console.log('/api/translate message : ', messages);

    const resp = await fetchWithRetry('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages,
        max_tokens: 500,
        temperature: 0.0,
        stream: false,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Mistral API error:', resp.status, text);
      return NextResponse.json(
        { success: false, error: resp.status === 401 ? 'API authentication failed' : 'AI service temporarily unavailable' },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      console.error('Unexpected Mistral response:', data);
      return NextResponse.json({ success: false, error: 'Invalid response from AI service' }, { status: 500 });
    }

    return NextResponse.json({ success: true, translation: aiMessage.trim() });
  } catch (err) {
    console.error('Route error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
