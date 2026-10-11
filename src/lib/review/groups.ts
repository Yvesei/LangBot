import type { StudyCard } from '../learning';
import { getReviewKey } from './text';

export interface ReviewGroup {
  key: string;
  card: StudyCard;
  ids: string[];
}

function addCardToReviewGroup(groups: Map<string, ReviewGroup>, card: StudyCard) {
  const key = getReviewKey(card);
  const existingGroup = groups.get(key);

  if (existingGroup) {
    existingGroup.card = card;
    existingGroup.ids.push(card.id);
    return;
  }

  groups.set(key, {
    key,
    card,
    ids: [card.id],
  });
}

export function groupReviewCards(cards: StudyCard[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();

  for (const card of cards) {
    addCardToReviewGroup(groups, card);
  }

  return Array.from(groups.values());
}
