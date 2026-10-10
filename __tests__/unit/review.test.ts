/** @jest-environment jsdom */
import { createCard, loadCards, saveCards, STUDY_KEY } from '@/lib/learning';
import { createVocabularyCards, groupReviewCards } from '@/lib/review';
import { getReviewText } from '@/lib/review/text';
import { corrected, languageConfig } from '../../tests/fixtures';

beforeEach(() => localStorage.clear());

test('shows repeated edits once, using the most recent correction', () => {
  const first = createCard(
    'one',
    { ...corrected, correctedText: 'She goes home.' },
    languageConfig,
    'She go home.',
  )!;
  const second = createCard(
    'two',
    { ...corrected, correctedText: 'He goes to school.' },
    languageConfig,
    'He go to school.',
  )!;
  const different = createCard('three', corrected, languageConfig, 'I has a apple.')!;
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
  const first = createCard('one', corrected, languageConfig, 'I has a apple.')!;
  const second = {
    ...first,
    id: 'two',
    languageConfig: { nativeLanguage: 'es' as const, targetLanguage: 'en' as const },
  };
  expect(groupReviewCards([first, second])).toHaveLength(2);
});

test('saves a correction as a review card', () => {
  const card = createCard('one', { ...corrected }, languageConfig, 'I has a apple.')!;
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
    const card = createCard(
      'one',
      { ...corrected, correctedText },
      languageConfig,
      original,
    )!;
    expect(getReviewText(card)).toEqual({ originalText: front, correctedText: back });
  },
);

test.each([
  ['She happy.', 'She is happy.'],
  ['I have the the book.', 'I have the book.'],
])(
  'keeps sentence context when a word is missing or extra: %s',
  (originalText, correctedText) => {
    const card = createCard(
      'one',
      { ...corrected, correctedText },
      languageConfig,
      originalText,
    )!;
    expect(getReviewText(card)).toEqual({ originalText, correctedText });
  },
);

test('loads existing cards with defaults for the new review fields', () => {
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
    ]),
  );
  const cards = loadCards();
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    kind: 'correction',
    originalText: '',
    correctedText: '',
  });
  expect(groupReviewCards(cards)[0].card.focus).toBe('Use have with I.');
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
  );
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({
    kind: 'vocabulary',
    originalText: 'cuillère',
    correctedText: 'spoon',
    sourceMessageId: 'spoken-turn',
  });
  saveCards(cards);
  expect(loadCards()).toEqual(cards);
});
