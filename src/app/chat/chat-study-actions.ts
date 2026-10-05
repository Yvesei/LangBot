import { recordPractice, sameLanguages } from '@/lib/learning';
import type { ChatState } from './useChatState';

export function gradePractice(state: ChatState, cardId: string, correct: boolean) {
  state.setCards((current) =>
    current.map((card) => (card.id === cardId ? recordPractice(card, correct) : card)),
  );
}

export function forgetAllCards(state: ChatState) {
  if (!state.config) {
    return;
  }
  state.setCards((current) =>
    current.filter((card) => !sameLanguages(card.languageConfig, state.config!)),
  );
}

export function gradeReview(state: ChatState, ids: string[], correct: boolean) {
  state.setCards((current) =>
    current.map((card) => (ids.includes(card.id) ? recordPractice(card, correct) : card)),
  );
}

export function forgetCard(state: ChatState, id: string) {
  state.setCards((cards) => cards.filter((card) => card.id !== id));
}

export function forgetReview(state: ChatState, ids: string[]) {
  state.setCards((cards) => cards.filter((card) => !ids.includes(card.id)));
}
