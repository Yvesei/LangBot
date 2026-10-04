import { wordDiff } from './diff';
import type { StudyCard } from './learning';
import type { LanguageConfig, Vocabulary } from './schemas';

export interface ReviewGroup {
  key: string;
  card: StudyCard;
  ids: string[];
  sourceMessageIds: string[];
  occurrences: number;
  dueAt: number;
}

function normalizeText(text: string): string {
  return text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function getReviewKey(card: StudyCard): string {
  let before = card.originalText;
  let after = card.correctedText;

  if (card.kind === 'correction' && before) {
    const parts = wordDiff(before, after, card.languageConfig.targetLanguage);
    const removed: string[] = [];
    const added: string[] = [];
    for (const part of parts) {
      if (part.type === 'removed') {
        removed.push(part.text);
      }
      if (part.type === 'added') {
        added.push(part.text);
      }
    }
    before = removed.join(' ');
    after = added.join(' ');
  }

  if (!before && !after) {
    before = card.exercise?.sentence ?? card.focus;
    after = card.exercise?.answer ?? '';
  }

  return JSON.stringify([
    card.languageConfig.nativeLanguage,
    card.languageConfig.targetLanguage,
    card.kind,
    normalizeText(before),
    normalizeText(after),
  ]);
}

export function groupReviewCards(cards: StudyCard[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();

  for (const card of cards) {
    const key = getReviewKey(card);
    const group = groups.get(key);
    if (group) {
      group.card = card;
      group.ids.push(card.id);
      if (!group.sourceMessageIds.includes(card.sourceMessageId)) {
        group.sourceMessageIds.push(card.sourceMessageId);
        group.occurrences += 1;
      }
      group.dueAt = Math.min(group.dueAt, card.dueAt);
      continue;
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

  return Array.from(groups.values()).sort((first, second) => {
    if (first.occurrences !== second.occurrences) {
      return second.occurrences - first.occurrences;
    }
    return first.dueAt - second.dueAt;
  });
}

export function createVocabularyCards(
  messageId: string,
  content: string,
  vocabulary: Vocabulary[],
  config: LanguageConfig,
  now = Date.now(),
): StudyCard[] {
  const cards: StudyCard[] = [];
  const seen = new Set<string>();
  const originalMessage = normalizeText(content);

  for (const item of vocabulary) {
    const original = normalizeText(item.original);
    if (!originalMessage.includes(original) || seen.has(original)) {
      continue;
    }
    seen.add(original);
    cards.push({
      id: messageId + ':vocabulary:' + cards.length,
      sourceMessageId: messageId,
      languageConfig: config,
      kind: 'vocabulary',
      originalText: item.original,
      correctedText: item.translation,
      example: item.example,
      exercise: null,
      focus: item.explanation,
      dueAt: now,
      streak: 0,
      attempts: 0,
      successes: 0,
    });
  }

  return cards;
}
