import {
  correctionRequestSchema,
  correctionSchema,
} from '@/lib/schemas';
import { route, methodNotAllowed } from '@/lib/server/http';
import { complete } from '@/lib/server/mistral';
import { CORRECTION_RULES, learnerPrompt } from '@/lib/server/prompts';
import { normalizeCorrection } from '@/lib/server/correction';

export const runtime = 'nodejs';
export const maxDuration = 40;
export const POST = route(correctionRequestSchema, async (body, signal) => {
  const correction = await complete(
    correctionSchema,
    'correction',
    [
      {
        role: 'system',
        content: `${learnerPrompt(body.languageConfig, body.userLevel)}\n${CORRECTION_RULES}`,
      },
      {
        role: 'user',
        content: body.content,
      },
    ],
    signal,
  );
  return { correction: normalizeCorrection(body.content, correction) };
});
export const GET = methodNotAllowed;
