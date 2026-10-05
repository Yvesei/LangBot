import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { LanguageConfig, Level } from '@/lib/schemas';
import { getLanguageConfigFromStorage, getLevelFromStorage } from '@/lib/config/language';
import { loadCards, saveCards, type StudyCard } from '@/lib/learning';
import type { ActiveRequestRef } from './chat-types';

interface StoredPreferencesOptions {
  setConfig: Dispatch<SetStateAction<LanguageConfig | null>>;
  setLevel: Dispatch<SetStateAction<Level>>;
  setIsReady: Dispatch<SetStateAction<boolean>>;
  activeChatRequest: ActiveRequestRef;
  setCards: Dispatch<SetStateAction<StudyCard[]>>;
}

export function useStoredPreferences(options: StoredPreferencesOptions) {
  const initialOptions = useRef(options).current;
  useEffect(() => {
    const savedConfig = getLanguageConfigFromStorage();
    initialOptions.setConfig(savedConfig);
    initialOptions.setLevel(getLevelFromStorage());
    const savedCards = loadCards();
    initialOptions.setCards(savedCards);

    initialOptions.setIsReady(true);
    return () => initialOptions.activeChatRequest.current?.controller.abort();
  }, [initialOptions]);
}

interface ChatEffectsOptions {
  messagesChanged: unknown;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  cards: StudyCard[];
  isReady: boolean;
  setStorageWarning: Dispatch<SetStateAction<string>>;
}

export function useChatEffects(options: ChatEffectsOptions) {
  const { messagesChanged, messagesEndRef, cards, isReady, setStorageWarning } = options;
  useEffect(() => {
    if (isReady && !saveCards(cards)) {
      setStorageWarning(
        'Browser storage is unavailable. Practice progress will last only for this visit.',
      );
    }
  }, [cards, isReady, setStorageWarning]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesChanged, messagesEndRef]);
}
