import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { LanguageConfig, Level } from '@/lib/schemas';
import { loadCards, sameLanguages, saveCards, type StudyCard } from '@/lib/learning';
import { getLanguageConfigFromStorage, getLevelFromStorage } from '@/lib/config/language';
import type { ActiveRequestRef } from './chat-types';

interface StoredPreferencesOptions {
  setConfig: Dispatch<SetStateAction<LanguageConfig | null>>;
  setLevel: Dispatch<SetStateAction<Level>>;
  setCards: Dispatch<SetStateAction<StudyCard[]>>;
  setReviewOpen: Dispatch<SetStateAction<boolean>>;
  setIsReady: Dispatch<SetStateAction<boolean>>;
  activeChatRequest: ActiveRequestRef;
}

export function useStoredPreferences(options: StoredPreferencesOptions) {
  const initialOptions = useRef(options).current;

  useEffect(() => {
    const savedConfig = getLanguageConfigFromStorage();
    const savedCards = loadCards();
    initialOptions.setConfig(savedConfig);
    initialOptions.setLevel(getLevelFromStorage());
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
  cards: StudyCard[];
  isReady: boolean;
  messagesChanged: unknown;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  reviewRequested: boolean;
  loading: boolean;
  voiceOpen: boolean;
  setStorageWarning: Dispatch<SetStateAction<string>>;
  setReviewOpen: Dispatch<SetStateAction<boolean>>;
  setReviewRequested: Dispatch<SetStateAction<boolean>>;
}

export function useChatEffects(options: ChatEffectsOptions) {
  const {
    cards,
    isReady,
    messagesChanged,
    messagesEndRef,
    reviewRequested,
    loading,
    voiceOpen,
    setStorageWarning,
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
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messagesChanged, messagesEndRef]);
  useEffect(() => {
    if (reviewRequested && !loading && !voiceOpen) {
      setReviewOpen(true);
      setReviewRequested(false);
    }
  }, [loading, reviewRequested, setReviewOpen, setReviewRequested, voiceOpen]);
}
