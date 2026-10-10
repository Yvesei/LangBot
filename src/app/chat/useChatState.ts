import { useEffect, useRef, useState } from 'react';
import type { ConversationMessage } from '@/lib/chat/conversation';
import { getLanguageConfigFromStorage, getLevelFromStorage } from '@/lib/config/language';
import { loadCards, sameLanguages, saveCards, type StudyCard } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import type { LanguageConfig, Level } from '@/lib/schemas';

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
  const [config, setConfig] = useState<LanguageConfig | null>(null);
  const [level, setLevel] = useState<Level>('beginner');
  const [isReady, setIsReady] = useState(false);
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);
  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requestRef = activeChatRequest;
    const savedConfig = getLanguageConfigFromStorage();
    const savedCards = loadCards();
    const matchingCards = getVisibleCards(savedCards, savedConfig);
    const hasDueCards = matchingCards.some((card) => card.dueAt <= Date.now());

    setConfig(savedConfig);
    setLevel(getLevelFromStorage());
    setCards(savedCards);
    setReviewOpen(hasDueCards);
    setIsReady(true);

    return () => {
      requestRef.current?.controller.abort();
    };
  }, []);

  useEffect(() => {
    if (isReady && !saveCards(cards)) {
      setStorageWarning(
        'Browser storage is unavailable. Review progress will last only for this visit.',
      );
    }
  }, [cards, isReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (reviewRequested && !loading) {
      setReviewOpen(true);
      setReviewRequested(false);
    }
  }, [reviewRequested, loading]);

  const visibleCards = getVisibleCards(cards, config);

  return {
    config,
    setConfig,
    level,
    setLevel,
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
    reviewRequested,
    setReviewRequested,
    visibleCards,
    reviewGroups: groupReviewCards(visibleCards),
  };
}

export type ChatState = ReturnType<typeof useChatState>;
