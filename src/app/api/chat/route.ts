import { chatRequestSchema, tutorOutputSchema } from '@/lib/schemas';
import { route, methodNotAllowed } from '@/lib/server/http';
import { complete } from '@/lib/server/mistral';
import { tutorPrompt } from '@/lib/server/prompts';
import { normalizeBilingualCorrection } from '@/lib/server/bilingual-correction';

export const runtime = 'nodejs';
export const maxDuration = 40;
export const POST = route(chatRequestSchema, async (body, signal) => {
  const result = await complete(
    tutorOutputSchema,
    'tutor',
    [
      {
        role: 'system',
        content: tutorPrompt(body.languageConfig, body.userLevel),
      },
      ...body.history,
      {
        role: 'user',
        content: JSON.stringify({
          learnerMessage: body.prompt,
          learningFocus: body.learningFocus,
        }),
      },
    ],
    signal,
  );
  return {
    ...result,
    correction: normalizeBilingualCorrection(
      body.prompt,
      result.correction,
      result.vocabulary,
    ),
  };
});
export const GET = methodNotAllowed;
