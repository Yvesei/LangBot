/** @jest-environment jsdom */
import { createCard, loadCards, saveCards, STUDY_KEY } from '@/lib/learning';
import { createVocabularyCards, groupReviewCards } from '@/lib/review';
import { corrected, languageConfig } from '../../tests/fixtures';

beforeEach(() => localStorage.clear());

test('groups the same edit across sentences and counts separate messages', () => {
  const first = createCard(
    'one',
    { ...corrected, correctedText: 'She goes home.' },
    languageConfig,
    100,
    'She go home.',
  )!;
  const second = createCard(
    'two',
    { ...corrected, correctedText: 'He goes to school.' },
    languageConfig,
    200,
    'He go to school.',
  )!;
  const different = createCard('three', corrected, languageConfig, 50, 'I has a apple.')!;
  const groups = groupReviewCards([different, first, second]);
  expect(groups).toHaveLength(2);
  expect(groups[0]).toMatchObject({ ids: ['one', 'two'], occurrences: 2, dueAt: 100 });
  expect(groups[0].card.originalText).toBe('He go to school.');
  expect(groupReviewCards([different, second])[1].occurrences).toBe(1);
});

test('keeps language pairs separate even when corrections match', () => {
  const first = createCard('one', corrected, languageConfig, 100, 'I has a apple.')!;
  const second = {
    ...first,
    id: 'two',
    languageConfig: { nativeLanguage: 'es' as const, targetLanguage: 'en' as const },
  };
  expect(groupReviewCards([first, second])).toHaveLength(2);
});

test('saves a correction without requiring a generated exercise', () => {
  const card = createCard(
    'one',
    { ...corrected, exercise: null },
    languageConfig,
    100,
    'I has a apple.',
  )!;
  expect(card.originalText).toBe('I has a apple.');
  expect(card.correctedText).toBe('I have an apple.');
  expect(card.exercise).toBeNull();
  expect(saveCards([card])).toBe(true);
  expect(loadCards()).toEqual([card]);
});

test('loads existing cards with defaults for the new review fields', () => {
  localStorage.setItem(
    STUDY_KEY,
    JSON.stringify([
      {
        id: 'legacy',
        sourceMessageId: 'legacy',
        languageConfig,
        exercise: corrected.exercise,
        focus: 'Use have with I.',
        dueAt: 100,
        streak: 0,
        attempts: 0,
        successes: 0,
      },
    ]),
  );
  const cards = loadCards();
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    kind: 'correction',
    originalText: '',
    correctedText: '',
  });
  expect(groupReviewCards(cards)[0].card.exercise?.answer).toBe('have');
});

test('saves only vocabulary found in the message, without duplicate cards', () => {
  const vocabulary = {
    original: 'cuillère',
    translation: 'spoon',
    example: 'May I have a spoon?',
    explanation: 'Une cuillère se dit spoon.',
  };
  const cards = createVocabularyCards(
    'spoken-turn',
    'I need une cuillère.',
    [vocabulary, vocabulary, { ...vocabulary, original: 'fourchette' }],
    languageConfig,
    100,
  );
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    kind: 'vocabulary',
    originalText: 'cuillère',
    correctedText: 'spoon',
    sourceMessageId: 'spoken-turn',
    exercise: null,
  });
  saveCards(cards);
  expect(loadCards()).toEqual(cards);
});
