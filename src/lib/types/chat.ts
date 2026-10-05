import type { Correction, ChatResult } from '../schemas';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  correction?: Correction | null;
  status?: 'pending' | 'complete' | 'failed';
};
export type ChatResponse = { success: true } & ChatResult;
export type { ChatRequest } from '../schemas';
