import { NextRequest, NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/utils';

const CORRECTION_INSTRUCTIONS = `
You are a text correction assistant.
- Correct only spelling and grammar mistakes.
- Ignore punctuation and capitalization errors.
- If the text has no mistakes, reply with only and exactly: [CORRECT], nothig more.
- never return anything with [CORRECT].
`;

// Minimal request body type
type Body = {
  content?: string;
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

    if (!content) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.error('MISTRAL_API_KEY not found');
      return NextResponse.json({ success: false, error: 'API configuration error' }, { status: 500 });
    }

    const messages = [
      { role: 'system', content: CORRECTION_INSTRUCTIONS },
      { role: 'user', content: content }
    ];

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

    return NextResponse.json({ success: true, correctedContent: aiMessage.trim() });
  } catch (err) {
    console.error('Route error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
