import { z } from 'zod';
import { getChatAccount } from '@/lib/server/chat/account';
import {
  databaseUnavailable,
  ensureConversation,
  failTurn,
  finishTurn,
  reserveTurn,
} from '@/lib/server/chat/storage';
import { MAX_CONVERSATION_LENGTH, MAX_HISTORY_MESSAGES } from '@/lib/config/limits';
import { normalizeCorrection } from '@/lib/server/correction';
import { ApiError } from '@/lib/server/errors';
import { guardedRoute } from '@/lib/server/http/guarded-route';
import { readJsonBody } from '@/lib/server/http/request-body';
import { complete } from '@/lib/server/mistral';
import { tutorResponseSchema } from '@/lib/server/output-schemas';
import { tutorPrompt } from '@/lib/server/prompts';
import { languageConfigSchema } from '@/lib/schemas/language';

export const runtime = 'nodejs';
export const maxDuration = 40;

const requestSchema = z
  .object({
    conversationId: z.string().uuid(),
    messageId: z.string().uuid(),
    prompt: z.string().trim().min(1).max(2000),
    languageConfig: languageConfigSchema,
    learningFocus: z.array(z.string().min(1).max(500)).max(3).default([]),
    origin: z.enum(['text', 'voice']).default('text'),
  })
  .strict();

function fitHistory(rows: Array<{ prompt: string; reply: string }>, prompt: string) {
  const history = rows
    .flatMap((row) => [
      {
        role: 'user' as const,
        content: row.prompt,
      },
      {
        role: 'assistant' as const,
        content: row.reply,
      },
    ])
    .slice(-MAX_HISTORY_MESSAGES);
  let length =
    prompt.length + history.reduce((total, item) => total + item.content.length, 0);
  while (length > MAX_CONVERSATION_LENGTH && history.length > 0) {
    length -= history.shift()!.content.length;
  }
  return history;
}

export const POST = guardedRoute(async (request) => {
  const { client, user } = await getChatAccount();
  const parsed = requestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid chat request.');
  }
  const body = parsed.data;
  await ensureConversation(client, user.id, {
    id: body.conversationId,
    config: body.languageConfig,
    prompt: body.prompt,
  });
  const reservation = await reserveTurn(client, body.conversationId, {
    id: body.messageId,
    prompt: body.prompt,
    origin: body.origin,
  });
  if (reservation.completed) {
    return {
      conversationId: body.conversationId,
      messageId: body.messageId,
      ...reservation.completed,
    };
  }

  try {
    const { data, error } = await client
      .from('chat_turns')
      .select('prompt,reply')
      .eq('conversation_id', body.conversationId)
      .eq('status', 'complete')
      .lt('created_at', reservation.turn.created_at)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error || !data) {
      throw databaseUnavailable();
    }
    const rows = data.reverse().filter((row) => typeof row.reply === 'string');
    const history = fitHistory(
      rows as Array<{ prompt: string; reply: string }>,
      body.prompt,
    );
    const output = await complete(
      tutorResponseSchema(body.languageConfig),
      'tutor',
      [
        {
          role: 'system',
          content: tutorPrompt(body.languageConfig),
        },
        ...history,
        {
          role: 'user',
          content: JSON.stringify({
            learnerMessage: body.prompt,
            learningFocus: body.learningFocus,
          }),
        },
      ],
      request.signal,
    );
    const result = {
      reply: output.reply,
      correction: normalizeCorrection(body.prompt, output.correction),
    };
    await finishTurn(client, body.messageId, reservation.attemptId, result);
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.conversationId)
      .eq('user_id', user.id);
    return {
      conversationId: body.conversationId,
      messageId: body.messageId,
      ...result,
    };
  } catch (error) {
    await failTurn(client, body.messageId, reservation.attemptId);
    throw error;
  }
});
