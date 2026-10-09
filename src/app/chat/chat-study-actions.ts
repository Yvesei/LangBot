import { recordReview } from '@/lib/learning';
import type { ChatState } from './useChatState';

export function gradeReview(state: ChatState, ids: string[], correct: boolean) {
  state.setCards((current) =>
    current.map((card) => (ids.includes(card.id) ? recordReview(card, correct) : card)),
  );
}

export function forgetReview(state: ChatState, ids: string[]) {
  state.setCards((cards) => cards.filter((card) => !ids.includes(card.id)));
}
