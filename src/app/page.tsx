'use client';

import { useEffect, useRef, useState } from 'react';
import { send } from '@/lib/api';
import type { LanguageConfig, Level } from '@/lib/schemas';
import {
  addAssistantReply,
  buildChatRequest,
  getConversationTopics,
  updateMessageStatus,
  type ConversationMessage,
} from '@/lib/chat/conversation';
import {
  createCard,
  loadCards,
  recordPractice,
  sameLanguages,
  saveCards,
  type StudyCard,
} from '@/lib/learning';
import {
  getLanguageConfigFromStorage,
  getLevelFromStorage,
  saveLanguageConfigToStorage,
} from '@/lib/config/language';
import { ChatHeader } from '@/components/ui/chat/ChatHeader';
import { ChatInput } from '@/components/ui/chat/ChatInput';
import { Message } from '@/components/ui/chat/Message';
import { ConversationWelcome } from '@/components/ui/chat/ConversationWelcome';
import { EmptyState } from '@/components/ui/states/EmptyState';
import { PracticePanel } from '@/components/ui/panels/PracticePanel';
import { VoiceCall } from '@/components/ui/voice/VoiceCall';
import { ReviewDialog } from '@/components/ui/panels/ReviewDialog';
import { createVocabularyCards, groupReviewCards } from '@/lib/review';

interface ActiveChatRequest {
  controller: AbortController;
  messageId: string;
}

export default function Page() {
  const [config, setConfig] = useState<LanguageConfig | null>(null);
  const [level, setLevel] = useState<Level>('beginner');
  const [isReady, setIsReady] = useState(false);
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);

  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedConfig = getLanguageConfigFromStorage();
    const savedCards = loadCards();
    setConfig(savedConfig);
    setLevel(getLevelFromStorage());
    setCards(savedCards);
    if (savedConfig) {
      const hasDueCards = savedCards.some((card) => {
        return (
          sameLanguages(card.languageConfig, savedConfig) && card.dueAt <= Date.now()
        );
      });
      setReviewOpen(hasDueCards);
    }
    setIsReady(true);

    return () => {
      activeChatRequest.current?.controller.abort();
    };
  }, []);

  useEffect(() => {
    if (isReady && !saveCards(cards)) {
      setStorageWarning(
        'Browser storage is unavailable. Practice progress will last only for this visit.',
      );
    }
  }, [cards, isReady]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

  const visibleCards = cards.filter((card) => {
    return config !== null && sameLanguages(card.languageConfig, config);
  });
  const topics = getConversationTopics(messages);
  const reviewGroups = groupReviewCards(visibleCards);

  useEffect(() => {
    if (reviewRequested && !loading && !voiceOpen) {
      setReviewOpen(true);
      setReviewRequested(false);
    }
  }, [reviewRequested, loading, voiceOpen]);

  function handleCancel() {
    const pendingRequest = activeChatRequest.current;

    if (!pendingRequest) {
      return;
    }

    pendingRequest.controller.abort();
    activeChatRequest.current = null;
    setMessages((current) => {
      return updateMessageStatus(current, pendingRequest.messageId, 'failed');
    });
    setLoading(false);
  }

  function handleNewChat() {
    if (messages.length > 0 && visibleCards.length > 0) {
      setReviewRequested(true);
    }
    handleCancel();
    setVoiceOpen(false);
    setMessages([]);
    setPrompt('');
    setError('');
  }

  function handleLanguageSelect(nextConfig: LanguageConfig) {
    handleNewChat();
    setReviewOpen(false);
    setReviewRequested(false);
    setConfig(nextConfig);
    setIsSelectingLanguages(false);

    if (!saveLanguageConfigToStorage(nextConfig, level)) {
      setStorageWarning('Language settings could not be saved in this browser.');
    }
  }

  function handleLevelChange(nextLevel: Level) {
    setLevel(nextLevel);

    if (config && !saveLanguageConfigToStorage(config, nextLevel)) {
      setStorageWarning('Your level could not be saved in this browser.');
    }
  }

  function handleChangeLanguages() {
    handleCancel();
    setVoiceOpen(false);
    setReviewOpen(false);
    setReviewRequested(false);
    setIsSelectingLanguages(true);
  }

  function handleDeleteMessage(messageId: string) {
    handleCancel();

    setMessages((current) => {
      return current.filter((message) => {
        return message.id !== messageId && message.replyTo !== messageId;
      });
    });

    setCards((current) => {
      return current.filter((card) => card.sourceMessageId !== messageId);
    });
    setError('');
  }

  function handlePracticeGrade(cardId: string, correct: boolean) {
    setCards((current) => {
      return current.map((card) => {
        if (card.id === cardId) {
          return recordPractice(card, correct);
        }

        return card;
      });
    });
  }

  function handleForgetCard(cardId: string) {
    setCards((current) => current.filter((card) => card.id !== cardId));
  }

  function handleForgetAllCards() {
    if (!config) {
      return;
    }

    setCards((current) => {
      return current.filter((card) => !sameLanguages(card.languageConfig, config));
    });
  }

  function handleOpenVoiceCall() {
    setError('');
    setVoiceOpen(true);
  }

  function handleCloseVoiceCall() {
    setVoiceOpen(false);
    if (visibleCards.length > 0 || loading) {
      setReviewRequested(true);
    }
  }

  function handleReviewGrade(ids: string[], correct: boolean) {
    setCards((current) =>
      current.map((card) => {
        if (ids.includes(card.id)) {
          return recordPractice(card, correct);
        }
        return card;
      }),
    );
  }

  function handleForgetReview(ids: string[]) {
    setCards((current) => current.filter((card) => !ids.includes(card.id)));
  }

  function handleClearError() {
    setError('');
  }

  function handleSend() {
    void sendMessage();
  }

  function handleSpokenMessage(content: string) {
    void sendMessage(undefined, content);
  }

  function handleRetryMessage(message: ConversationMessage) {
    void sendMessage(message);
  }

  async function sendMessage(retryMessage?: ConversationMessage, spokenContent?: string) {
    if (!config || activeChatRequest.current || isSelectingLanguages) {
      return;
    }

    const content = retryMessage?.content ?? spokenContent?.trim() ?? prompt.trim();

    if (!content) {
      return;
    }

    const messageId = retryMessage?.id ?? crypto.randomUUID();
    const controller = new AbortController();

    activeChatRequest.current = {
      controller,
      messageId,
    };
    setLoading(true);
    setError('');

    if (retryMessage) {
      setMessages((current) => updateMessageStatus(current, messageId, 'pending'));
    } else {
      if (spokenContent === undefined) {
        setPrompt('');
      }

      const userMessage: ConversationMessage = {
        id: messageId,
        role: 'user',
        content,
        timestamp: new Date(),
        status: 'pending',
      };

      setMessages((current) => [...current, userMessage]);
    }

    function isCurrentRequest() {
      return (
        !controller.signal.aborted && activeChatRequest.current?.controller === controller
      );
    }

    try {
      const requestBody = buildChatRequest({
        content,
        messages,
        cards: visibleCards,
        config,
        level,
        retryMessageId: retryMessage?.id,
      });

      const tutorResponse = await send(requestBody, controller.signal);

      if (!isCurrentRequest()) {
        return;
      }

      setMessages((current) => addAssistantReply(current, messageId, tutorResponse));

      const correctionCard = createCard(
        messageId,
        tutorResponse.correction,
        config,
        Date.now(),
        content,
      );
      const generatedCards = createVocabularyCards(
        messageId,
        content,
        tutorResponse.vocabulary ?? [],
        config,
      );
      if (correctionCard) {
        generatedCards.push(correctionCard);
      }

      if (generatedCards.length > 0) {
        setCards((current) => {
          const retainedCards = current.filter((card) => card.sourceMessageId !== messageId);
          return [...retainedCards, ...generatedCards].slice(-100);
        });
      }
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      setMessages((current) => updateMessageStatus(current, messageId, 'failed'));
      setError(
        error instanceof Error
          ? error.message
          : 'Could not send the message. Please retry.',
      );
    } finally {
      if (activeChatRequest.current?.controller === controller) {
        activeChatRequest.current = null;
        setLoading(false);
      }
    }
  }

  function renderChatContent() {
    if (!isReady) {
      return <p role="status">Loading your preferences…</p>;
    }

    if (!config || isSelectingLanguages) {
      return (
        <EmptyState
          initial={config}
          onLanguageSelect={handleLanguageSelect}
          onCancel={config ? () => setIsSelectingLanguages(false) : undefined}
        />
      );
    }

    return (
      <>
        <div className="mb-5 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            className="subtle-button"
            onClick={() => setReviewOpen(true)}
          >
            Review cards · {reviewGroups.length}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="text-[var(--muted)]"
              onClick={handleNewChat}
            >
              End session & review
            </button>
          )}
        </div>
        <PracticePanel
          key={config.nativeLanguage + config.targetLanguage}
          cards={visibleCards.filter((card) => card.exercise !== null)}
          config={config}
          onGrade={handlePracticeGrade}
          onForget={handleForgetCard}
          onForgetAll={handleForgetAllCards}
        />

        {topics.length > 0 && (
          <p
            className="mb-6 text-xs text-[var(--muted)]"
            lang={config.nativeLanguage}
          >
            {topics.join(' / ')}
          </p>
        )}

        {messages.length === 0 && (
          <ConversationWelcome
            config={config}
            loading={loading}
            onStartConversation={handleSpokenMessage}
          />
        )}

        <div className="space-y-5">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              config={config}
              busy={loading}
              onDelete={() => handleDeleteMessage(message.id)}
              onRetry={() => handleRetryMessage(message)}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="app-shell">
      <ChatHeader
        config={config}
        level={level}
        onLevelChange={handleLevelChange}
        onNewChat={handleNewChat}
        onChangeLanguages={handleChangeLanguages}
      />

      <main className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 py-6 sm:px-6">
          {renderChatContent()}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            >
              {error}
            </p>
          )}

          {storageWarning && (
            <p
              role="status"
              className="mt-4 text-sm text-amber-700 dark:text-amber-300"
            >
              {storageWarning}
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <ChatInput
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        onSend={handleSend}
        onCancel={handleCancel}
        onVoiceCall={handleOpenVoiceCall}
        disabled={!isReady || !config || isSelectingLanguages}
      />

      {config && voiceOpen && (
        <VoiceCall
          open
          config={config}
          messages={messages}
          loading={loading}
          error={error}
          onSend={handleSpokenMessage}
          onRetry={handleRetryMessage}
          onClearError={handleClearError}
          onClose={handleCloseVoiceCall}
        />
      )}
      {config && reviewOpen && !voiceOpen && (
        <ReviewDialog
          cards={visibleCards}
          config={config}
          onGrade={handleReviewGrade}
          onForget={handleForgetReview}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}
