import { useEffect, useRef, useState } from 'react';
import type { ConversationMessage } from '@/lib/chat/conversation';
import { usePreferences } from '@/lib/config/usePreferences';
import { loadCards, sameLanguages, saveCards, type StudyCard } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import type { LanguageConfig } from '@/lib/schemas';
import { useGuestMessageCount } from '@/lib/auth/guest-message-limit';
import { useAuthSession } from '@/lib/auth/client';

interface ActiveChatRequest {
  controller: AbortController;
  messageId: string;
}

function getVisibleCards(cards: StudyCard[], config: LanguageConfig | null) {
  if (!config) {
    return [];
  }

  return cards.filter((card) => sameLanguages(card.languageConfig, config));
}

function useSavedCards() {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [cardsReady, setCardsReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  useEffect(() => {
    setCards(loadCards());
    setCardsReady(true);
  }, []);
  useEffect(() => {
    if (cardsReady && !saveCards(cards)) {
      setStorageWarning(
        'Browser storage is unavailable. Flashcards will last only for this visit.',
      );
    }
  }, [cards, cardsReady]);
  return {
    cards,
    setCards,
    cardsReady,
    storageWarning,
  };
}

export function useChatState() {
  const auth = useAuthSession();
  const preferences = usePreferences(auth);
  const { guestMessageCount, recordGuestMessage } = useGuestMessageCount();
  const { config, setConfig, guestMessageLimit } = preferences;
  const { cards, setCards, cardsReady, storageWarning } = useSavedCards();
  const isReady = cardsReady && preferences.isReady;
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = auth.session?.user.id ?? null;
  const context = useRef({
    userId,
    config,
  });
  useEffect(() => {
    const previous = context.current;
    context.current = {
      userId,
      config: config ?? previous.config,
    };
    if (previous.userId !== userId) {
      setVoiceOpen(false);
    }
    const changedAccount = previous.userId && previous.userId !== userId;
    const changedLanguages =
      previous.config && config && !sameLanguages(previous.config, config);
    if (changedAccount || changedLanguages) {
      activeChatRequest.current?.controller.abort();
      activeChatRequest.current = null;
      setMessages([]);
      setPrompt('');
      setLoading(false);
      setError('');
      setReviewOpen(false);
      setVoiceOpen(false);
      setIsSelectingLanguages(false);
    }
  }, [userId, config]);

  useEffect(() => () => activeChatRequest.current?.controller.abort(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

  const visibleCards = getVisibleCards(cards, config);
  const isGuestLimitReached =
    auth.isConfigured &&
    !auth.isLoading &&
    isReady &&
    !auth.session &&
    guestMessageCount >= guestMessageLimit;

  useEffect(() => {
    if (isGuestLimitReached) {
      setVoiceOpen(false);
    }
  }, [isGuestLimitReached]);

  return {
    auth,
    isGuestLimitReached,
    guestMessageLimit,
    recordGuestMessage,
    config,
    setConfig,
    isReady,
    isSelectingLanguages,
    setIsSelectingLanguages,
    prompt,
    setPrompt,
    messages,
    setMessages,
    loading,
    setLoading,
    error,
    setError,
    storageWarning: preferences.warning || storageWarning,
    preferencesError: preferences.error,
    retryPreferences: preferences.retry,
    retrySavePreferences: preferences.retrySave,
    hasPreferenceSaveError: Boolean(preferences.warning && auth.session),
    activeChatRequest,
    messagesEndRef,
    cards,
    setCards,
    reviewOpen,
    setReviewOpen,
    voiceOpen,
    setVoiceOpen,
    visibleCards,
    reviewGroups: groupReviewCards(visibleCards),
  };
}

export type ChatState = ReturnType<typeof useChatState>;
