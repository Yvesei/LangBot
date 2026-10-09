import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { LanguageConfig, Level } from '@/lib/schemas';
import { getLanguageConfigFromStorage, getLevelFromStorage } from '@/lib/config/language';

import type { ActiveRequestRef } from './chat-types';

interface StoredPreferencesOptions {
  setConfig: Dispatch<SetStateAction<LanguageConfig | null>>;
  setLevel: Dispatch<SetStateAction<Level>>;
  setIsReady: Dispatch<SetStateAction<boolean>>;
  activeChatRequest: ActiveRequestRef;
}

export function useStoredPreferences(options: StoredPreferencesOptions) {
  const initialOptions = useRef(options).current;
  useEffect(() => {
    const savedConfig = getLanguageConfigFromStorage();
    initialOptions.setConfig(savedConfig);
    initialOptions.setLevel(getLevelFromStorage());

    initialOptions.setIsReady(true);
    return () => initialOptions.activeChatRequest.current?.controller.abort();
  }, [initialOptions]);
}

interface ChatEffectsOptions {
  messagesChanged: unknown;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function useChatEffects(options: ChatEffectsOptions) {
  const { messagesChanged, messagesEndRef } = options;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesChanged, messagesEndRef]);
}
