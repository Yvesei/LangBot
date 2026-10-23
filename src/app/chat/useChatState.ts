import { useEffect, useRef, useState } from 'react';
import type { ConversationMessage } from '@/lib/chat/conversation';
import { getLanguageConfigFromStorage } from '@/lib/config/language';
import { loadCards, sameLanguages, saveCards, type StudyCard } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import type { LanguageConfig } from '@/lib/schemas';
import {
  GUEST_MESSAGE_LIMIT,
  useGuestMessageCount,
} from '@/lib/auth/guest-message-limit';
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

export function useChatState() {
  const auth = useAuthSession();
  const { guestMessageCount, recordGuestMessage } = useGuestMessageCount();
  const [config, setConfig] = useState<LanguageConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requestRef = activeChatRequest;
    const savedConfig = getLanguageConfigFromStorage();
    const savedCards = loadCards();

    setConfig(savedConfig);
    setCards(savedCards);
    setIsReady(true);

    return () => {
      requestRef.current?.controller.abort();
    };
  }, []);

  useEffect(() => {
    if (isReady && !saveCards(cards)) {
      setStorageWarning(
        'Browser storage is unavailable. Flashcards will last only for this visit.',
      );
    }
  }, [cards, isReady]);

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
    !auth.session &&
    guestMessageCount >= GUEST_MESSAGE_LIMIT;

  useEffect(() => {
    if (isGuestLimitReached) {
      setVoiceOpen(false);
    }
  }, [isGuestLimitReached]);

  return {
    auth,
    isGuestLimitReached,
    guestMessageCount,
    recordGuestMessage,
    config,
    setConfig,
    isReady,
    setIsReady,
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
    storageWarning,
    setStorageWarning,
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
