import { z } from 'zod';
import { ApiError } from './errors';

const MAX_COMPLETION_CONTENT_LENGTH = 30000;
const INVALID_COMPLETION_MESSAGE = 'The AI returned an invalid response. Please retry.';

const completionChoiceSchema = z.object({
  finish_reason: z.literal('stop'),
  message: z.object({ content: z.string().min(1).max(MAX_COMPLETION_CONTENT_LENGTH) }),
});

const usageSchema = z.object({
  prompt_tokens: z.number().nonnegative(),
  completion_tokens: z.number().nonnegative(),
});

const completionResponseSchema = z.object({
  model: z.string().optional(),
  choices: z.array(completionChoiceSchema).min(1),
  usage: usageSchema.optional(),
});

function parseCompletionEnvelope(responseBody: unknown) {
  const parsedResponse = completionResponseSchema.safeParse(responseBody);

  if (!parsedResponse.success) {
    throw new ApiError(502, 'The AI response was incomplete. Please retry.');
  }

  return parsedResponse.data;
}

function parseCompletionPayload(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new ApiError(502, INVALID_COMPLETION_MESSAGE);
  }
}

export async function parseCompletionResponse<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
) {
  const responseBody = await response.json();
  const completion = parseCompletionEnvelope(responseBody);
  const content = completion.choices[0].message.content;
  const completionPayload = parseCompletionPayload(content);
  const parsedPayload = schema.safeParse(completionPayload);

  if (!parsedPayload.success) {
    throw new ApiError(502, INVALID_COMPLETION_MESSAGE);
  }

  return {
    data: parsedPayload.data,
    model: completion.model,
    usage: completion.usage ?? null,
  };
}
