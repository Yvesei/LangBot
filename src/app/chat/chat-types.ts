import type { MutableRefObject } from 'react';

export interface ActiveChatRequest {
  controller: AbortController;
  messageId: string;
}

export type ActiveRequestRef = MutableRefObject<ActiveChatRequest | null>;
