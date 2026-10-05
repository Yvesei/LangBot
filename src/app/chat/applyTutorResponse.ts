import { addAssistantReply } from '@/lib/chat/conversation';
import { createCard } from '@/lib/learning';
import { createVocabularyCards } from '@/lib/review';
import type { ChatResult, LanguageConfig } from '@/lib/schemas';
import type { ChatState } from './useChatState';

const MAX_SAVED_CARDS = 100;

interface TutorResponseOptions {
  messageId: string;
  content: string;
  tutorResponse: ChatResult;
  config: LanguageConfig;
  state: ChatState;
}

export function applyTutorResponse(options: TutorResponseOptions) {
  const { messageId, content, tutorResponse, config, state } = options;
  state.setMessages((current) => addAssistantReply(current, messageId, tutorResponse));
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
  if (generatedCards.length === 0) {
    return;
  }
  state.setCards((current) => {
    const retainedCards = current.filter((card) => card.sourceMessageId !== messageId);
    return [...retainedCards, ...generatedCards].slice(-MAX_SAVED_CARDS);
  });
}
