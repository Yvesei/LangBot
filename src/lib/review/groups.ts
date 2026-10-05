import type { StudyCard } from '../learning';
import { getReviewKey } from './text';

export interface ReviewGroup {
  key: string;
  card: StudyCard;
  ids: string[];
  sourceMessageIds: string[];
  occurrences: number;
  dueAt: number;
}

function addReviewOccurrence(group: ReviewGroup, card: StudyCard) {
  group.card = card;
  group.ids.push(card.id);

  if (!group.sourceMessageIds.includes(card.sourceMessageId)) {
    group.sourceMessageIds.push(card.sourceMessageId);
    group.occurrences += 1;
  }

  group.dueAt = Math.min(group.dueAt, card.dueAt);
}

function addCardToReviewGroup(groups: Map<string, ReviewGroup>, card: StudyCard) {
  const key = getReviewKey(card);
  const existingGroup = groups.get(key);

  if (existingGroup) {
    addReviewOccurrence(existingGroup, card);
    return;
  }

  groups.set(key, {
    key,
    card,
    ids: [card.id],
    sourceMessageIds: [card.sourceMessageId],
    occurrences: 1,
    dueAt: card.dueAt,
  });
}

function compareReviewGroups(first: ReviewGroup, second: ReviewGroup): number {
  return first.occurrences === second.occurrences
    ? first.dueAt - second.dueAt
    : second.occurrences - first.occurrences;
}

export function groupReviewCards(cards: StudyCard[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();

  for (const card of cards) {
    addCardToReviewGroup(groups, card);
  }

  return Array.from(groups.values()).sort(compareReviewGroups);
}
