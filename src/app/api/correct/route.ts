import { correctionRequestSchema } from '@/lib/schemas';
import { route, methodNotAllowed } from '@/lib/server/http';
import { complete } from '@/lib/server/mistral';
import { correctionPrompt } from '@/lib/server/prompts';
import { normalizeCorrection } from '@/lib/server/correction';
import { correctionOutputSchema } from '@/lib/server/output-schemas';

export const runtime = 'nodejs';
export const maxDuration = 40;
export const POST = route(correctionRequestSchema, async (body, signal) => {
  const correction = await complete(
    correctionOutputSchema(body.languageConfig),
    'correction',
    [
      {
        role: 'system',
        content: correctionPrompt(body.languageConfig),
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
