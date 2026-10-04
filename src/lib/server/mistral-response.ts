import { z } from 'zod';
import { ApiError } from './errors';

const completionChoiceSchema = z.object({
  finish_reason: z.literal('stop'),
  message: z.object({ content: z.string().min(1).max(30000) }),
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

export async function parseCompletionResponse<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
) {
  const body = await response.json();
  const parsedResponse = completionResponseSchema.safeParse(body);

  if (!parsedResponse.success) {
    throw new ApiError(502, 'The AI response was incomplete. Please retry.');
  }

  const completion = parsedResponse.data;
  const content = completion.choices[0].message.content;
  let result: unknown;

  try {
    result = JSON.parse(content);
  } catch {
    throw new ApiError(502, 'The AI returned an invalid response. Please retry.');
  }

  const parsedResult = schema.safeParse(result);

  if (!parsedResult.success) {
    throw new ApiError(502, 'The AI returned an invalid response. Please retry.');
  }

  return {
    data: parsedResult.data,
    model: completion.model,
    usage: completion.usage ?? null,
  };
}
