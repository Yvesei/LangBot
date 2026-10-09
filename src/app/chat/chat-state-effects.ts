import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { LanguageConfig, Level } from '@/lib/schemas';
import { getLanguageConfigFromStorage, getLevelFromStorage } from '@/lib/config/language';
import { loadCards, sameLanguages, saveCards, type StudyCard } from '@/lib/learning';
import type { ActiveRequestRef } from './chat-types';

interface StoredPreferencesOptions {
  setConfig: Dispatch<SetStateAction<LanguageConfig | null>>;
  setLevel: Dispatch<SetStateAction<Level>>;
  setIsReady: Dispatch<SetStateAction<boolean>>;
  activeChatRequest: ActiveRequestRef;
  setCards: Dispatch<SetStateAction<StudyCard[]>>;
  setReviewOpen: Dispatch<SetStateAction<boolean>>;
}

export function useStoredPreferences(options: StoredPreferencesOptions) {
  const initialOptions = useRef(options).current;
  useEffect(() => {
    const savedConfig = getLanguageConfigFromStorage();
    initialOptions.setConfig(savedConfig);
    initialOptions.setLevel(getLevelFromStorage());
    const savedCards = loadCards();
    initialOptions.setCards(savedCards);
    initialOptions.setReviewOpen(
      Boolean(
        savedConfig &&
        savedCards.some(
          (card) =>
            sameLanguages(card.languageConfig, savedConfig) && card.dueAt <= Date.now(),
        ),
      ),
    );
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
  reviewRequested: boolean;
  loading: boolean;
  setReviewOpen: Dispatch<SetStateAction<boolean>>;
  setReviewRequested: Dispatch<SetStateAction<boolean>>;
}

export function useChatEffects(options: ChatEffectsOptions) {
  const {
    messagesChanged,
    messagesEndRef,
    cards,
    isReady,
    setStorageWarning,
    reviewRequested,
    loading,
    setReviewOpen,
    setReviewRequested,
  } = options;
  useEffect(() => {
    if (isReady && !saveCards(cards)) {
      setStorageWarning(
        'Browser storage is unavailable. Review progress will last only for this visit.',
      );
    }
  }, [cards, isReady, setStorageWarning]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messagesChanged, messagesEndRef]);
  useEffect(() => {
    if (reviewRequested && !loading) {
      setReviewOpen(true);
      setReviewRequested(false);
    }
  }, [loading, reviewRequested, setReviewOpen, setReviewRequested]);
}
