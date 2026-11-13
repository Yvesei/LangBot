import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ConversationMessage } from '@/lib/chat/conversation';
import { usePreferences } from '@/lib/config/usePreferences';
import { loadCards, sameLanguages, saveCards, type StudyCard } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import type { LanguageConfig } from '@/lib/schemas';
import { useAuthSession } from '@/lib/auth/client';
import { useConversationHistory } from './conversation/useConversationHistory';

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

function guestLimitReached(
  auth: ReturnType<typeof useAuthSession>,
  count: number,
  limit: number | null,
) {
  return limit !== null && auth.isAnonymous && count >= limit;
}

function useScrollToNewest(
  messages: ConversationMessage[],
  endRef: RefObject<HTMLDivElement | null>,
  preserveRef: RefObject<boolean>,
) {
  useLayoutEffect(() => {
    if (preserveRef.current) {
      preserveRef.current = false;
      return;
    }
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, endRef, preserveRef]);
}

export function useChatState() {
  const queryClient = useQueryClient();
  const auth = useAuthSession();
  const preferences = usePreferences(auth);
  const { setConfig, guestMessageLimit } = preferences;
  const { cards, setCards, cardsReady, storageWarning } = useSavedCards();
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const userId = auth.session?.user.id ?? null;
  const history = useConversationHistory(userId, setMessages);
  const config = history.config ?? preferences.config;
  const isReady =
    cardsReady && preferences.isReady && history.isReady && Boolean(auth.session);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const preserveScrollRef = useRef(false);

  const previousUserId = useRef(userId);
  useEffect(() => {
    if (previousUserId.current === userId) {
      return;
    }
    queryClient.removeQueries({ queryKey: ['conversations', previousUserId.current] });
    queryClient.removeQueries({ queryKey: ['conversation', previousUserId.current] });
    queryClient.removeQueries({ queryKey: ['settings', previousUserId.current] });
    queryClient.removeQueries({ queryKey: ['translation'] });
    queryClient.getMutationCache().clear();
    previousUserId.current = userId;
    activeChatRequest.current?.controller.abort();
    activeChatRequest.current = null;
    setMessages([]);
    setPrompt('');
    setLoading(false);
    setError('');
    setReviewOpen(false);
    setVoiceOpen(false);
    setIsSelectingLanguages(false);
  }, [userId, queryClient]);

  useEffect(() => () => activeChatRequest.current?.controller.abort(), []);

  useScrollToNewest(messages, messagesEndRef, preserveScrollRef);

  const visibleCards = getVisibleCards(cards, config);
  const isGuestLimitReached = guestLimitReached(
    auth,
    history.messageCount,
    guestMessageLimit,
  );

  useEffect(() => {
    if (isGuestLimitReached) {
      setVoiceOpen(false);
    }
  }, [isGuestLimitReached]);

  return {
    auth,
    history,
    isGuestLimitReached,
    guestMessageLimit,
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
    preserveScrollRef,
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
