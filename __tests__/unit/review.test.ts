/** @jest-environment jsdom */
import { createFlashcards, loadCards, saveCards, STUDY_KEY } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import { getReviewText } from '@/lib/review/text';
import { corrected, languageConfig } from '../../tests/fixtures';

beforeEach(() => localStorage.clear());

test('shows repeated edits once, using the most recent correction', () => {
  const first = createFlashcards(
    'one',
    { ...corrected, correctedText: 'She goes home.' },
    languageConfig,
    'She go home.',
  )[0]!;
  const second = createFlashcards(
    'two',
    { ...corrected, correctedText: 'He goes to school.' },
    languageConfig,
    'He go to school.',
  )[0]!;
  const different = createFlashcards(
    'three',
    corrected,
    languageConfig,
    'I has a apple.',
  )[0]!;
  const groups = groupReviewCards([different, first, second]);
  expect(groups).toHaveLength(2);
  expect(groups[1]).toMatchObject({ ids: ['one', 'two'] });
  expect(groups[1].card.originalText).toBe('He go to school.');
  expect(getReviewText(groups[1].card)).toEqual({
    originalText: 'go',
    correctedText: 'goes',
  });
});

test('keeps language pairs separate even when corrections match', () => {
  const first = createFlashcards('one', corrected, languageConfig, 'I has a apple.')[0]!;
  const second = {
    ...first,
    id: 'two',
    languageConfig: { nativeLanguage: 'es' as const, targetLanguage: 'en' as const },
  };
  expect(groupReviewCards([first, second])).toHaveLength(2);
});

test('saves a correction as a review card', () => {
  const card = createFlashcards(
    'one',
    { ...corrected },
    languageConfig,
    'I has a apple.',
  )[0]!;
  expect(card.originalText).toBe('I has a apple.');
  expect(card.correctedText).toBe('I have an apple.');
  expect(saveCards([card])).toBe(true);
  expect(loadCards()).toEqual([card]);
});

test.each([
  ['I recieved a message.', 'I received a message.', 'recieved', 'received'],
  ['I has a apple.', 'I have an apple.', 'has a', 'have an'],
])(
  'shows changed words instead of the full sentence: %s',
  (original, correctedText, front, back) => {
    const card = createFlashcards(
      'one',
      { ...corrected, correctedText },
      languageConfig,
      original,
    )[0]!;
    expect(getReviewText(card)).toEqual({ originalText: front, correctedText: back });
  },
);

test.each([
  ['She happy.', 'She is happy.'],
  ['I have the the book.', 'I have the book.'],
])(
  'keeps sentence context when a word is missing or extra: %s',
  (originalText, correctedText) => {
    const card = createFlashcards(
      'one',
      { ...corrected, correctedText },
      languageConfig,
      originalText,
    )[0]!;
    expect(getReviewText(card)).toEqual({ originalText, correctedText });
  },
);

test('loads previously saved cards and strips obsolete card fields', () => {
  localStorage.setItem(
    STUDY_KEY,
    JSON.stringify([
      {
        id: 'legacy',
        sourceMessageId: 'legacy',
        languageConfig,
        focus: 'Use have with I.',
        dueAt: 100,
        streak: 0,
        attempts: 0,
        successes: 0,
      },
      {
        id: 'saved-word',
        sourceMessageId: 'saved-word',
        languageConfig,
        kind: 'vocabulary',
        originalText: 'cuillère',
        correctedText: 'spoon',
        example: 'I need a spoon.',
        focus: 'Une cuillère se dit spoon.',
      },
    ]),
  );
  const cards = loadCards();
  expect(cards).toHaveLength(2);
  expect(cards[0]).toMatchObject({
    originalText: '',
    correctedText: '',
  });
  expect(groupReviewCards(cards)[0].card.focus).toBe('Use have with I.');
  expect(cards[1]).not.toHaveProperty('kind');
  expect(cards[1]).not.toHaveProperty('example');
  expect(getReviewText(cards[1])).toEqual({
    originalText: 'cuillère',
    correctedText: 'spoon',
  });
});

test('saves a translated word using the same flashcard function', () => {
  const correction = {
    correctedText: 'I need a spoon.',
    issues: [
      { category: 'translation' as const, explanation: 'Une cuillère se dit spoon.' },
    ],
  };
  const cards = createFlashcards(
    'spoken-turn',
    correction,
    languageConfig,
    'I need a cuillère.',
  );
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    originalText: 'I need a cuillère.',
    correctedText: 'I need a spoon.',
    sourceMessageId: 'spoken-turn',
  });
  expect(getReviewText(cards[0])).toEqual({
    originalText: 'cuillère',
    correctedText: 'spoon',
  });
  saveCards(cards);
  expect(loadCards()).toEqual(cards);
});
