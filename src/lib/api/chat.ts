import { z } from 'zod';
import { chatResultSchema, type ChatRequest } from '../schemas';
import { post } from './request';

export function send(body: ChatRequest, signal?: AbortSignal) {
  return post(
    '/api/chat',
    body,
    chatResultSchema.extend({ success: z.literal(true) }),
    signal,
  );
}
