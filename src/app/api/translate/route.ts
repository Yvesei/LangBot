import { translationRequestSchema, translationOutputSchema } from '@/lib/schemas';
import { route, methodNotAllowed } from '@/lib/server/http';
import { complete } from '@/lib/server/mistral';
import { translationPrompt } from '@/lib/server/prompts';

export const runtime = 'nodejs';
export const maxDuration = 40;
export const POST = route(translationRequestSchema, (body, signal) =>
  complete(
    translationOutputSchema,
    'translation',
    [
      {
        role: 'system',
        content: translationPrompt(body.languageConfig),
      },
      {
        role: 'user',
        content: body.content,
      },
    ],
    signal,
    3000,
  ),
);
export const GET = methodNotAllowed;
