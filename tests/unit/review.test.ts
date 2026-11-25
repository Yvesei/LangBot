/** @jest-environment jsdom */
import { createFlashcards, STUDY_KEY } from '@/lib/learning';
import { groupReviewCards } from '@/lib/review';
import { getReviewText } from '@/lib/review/text';
import { corrected, languageConfig } from '../fixtures';
import { QueryClient } from '@tanstack/react-query';
import { TextEncoder } from 'util';
import { waitFor } from '@testing-library/react';
import {
  applyPending,
  legacyCards,
  loadOutbox,
  saveOutbox,
} from '@/lib/learning/storage';
import { processQueue, removeCardsForMessage, type Scope } from '@/lib/learning/cardSync';
import { importLegacyBatch } from '@/lib/learning/importLegacyBatch';
import { deleteCardsForMessage, importCards } from '@/lib/learning/cardApi';

jest.mock('@/lib/learning/cardApi', () => ({
  importCards: jest.fn(),
  deleteCardsForMessage: jest.fn(),
}));

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

test('creates a review card from a correction', () => {
  const card = createFlashcards(
    'one',
    { ...corrected },
    languageConfig,
    'I has a apple.',
  )[0]!;
  expect(card.originalText).toBe('I has a apple.');
  expect(card.correctedText).toBe('I have an apple.');
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
  const cards = legacyCards().map(({ card }) => card);
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
});

test('restores queued changes only for their account', () => {
  const card = createFlashcards('one', corrected, languageConfig, 'Hello')[0]!;
  const operations = [
    { kind: 'save' as const, card },
    { kind: 'delete' as const, id: 'old' },
  ];
  expect(saveOutbox('user-a', operations, 'tab-one')).toBe(true);
  expect(saveOutbox('user-a', [{ kind: 'delete', id: 'second' }], 'tab-two')).toBe(true);
  expect(loadOutbox('user-b', 'tab-one')).toEqual([]);
  expect(loadOutbox('user-a', 'tab-two')).toEqual([{ kind: 'delete', id: 'second' }]);
  expect(applyPending([{ ...card, id: 'old' }], loadOutbox('user-a', 'tab-one'))).toEqual(
    [card],
  );
  expect(saveOutbox('user-a', [], 'tab-two')).toBe(true);
  expect(loadOutbox('user-a', 'tab-one')).toEqual(operations);
});

test('imports confirmed cards without deleting unmatched or subsequently changed legacy data', async () => {
  global.TextEncoder = TextEncoder as typeof global.TextEncoder;
  const first = createFlashcards('one', corrected, languageConfig, 'Hello')[0]!;
  const second = { ...first, id: 'two' };
  const changed = { ...first, id: 'three' };
  localStorage.setItem(
    STUDY_KEY,
    JSON.stringify([first, second, { ...changed, focus: 'Changed' }]),
  );
  const scope: Scope = {
    userId: 'user-a',
    queue: [first, second, changed].map((card) => ({ kind: 'import', card, raw: card })),
    running: false,
    blocked: false,
    imported: true,
    unmatched: [],
    controller: null,
  };
  scope.queue.push({ kind: 'delete', id: 'one' });
  const client = new QueryClient();
  jest.mocked(importCards).mockResolvedValue({
    success: true,
    userId: 'user-a',
    importedIds: ['one', 'three'],
  });
  await importLegacyBatch(
    scope,
    { client, active: { current: 'user-a' } },
    new AbortController().signal,
  );
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toEqual([
    second,
    { ...changed, focus: 'Changed' },
  ]);
  expect(scope.queue).toEqual([{ kind: 'delete', id: 'one' }]);
  expect(client.getQueryData(['cards', 'user-a'])).toEqual([changed]);
  expect(scope.unmatched.map((item) => item.card.id)).toEqual(['two']);
});

test('manual import preserves conflicting cards in browser storage', async () => {
  const card = createFlashcards('one', corrected, languageConfig, 'Hello')[0]!;
  localStorage.setItem(STUDY_KEY, JSON.stringify([card]));
  const scope: Scope = {
    userId: 'user-a',
    queue: [{ kind: 'claim', card, raw: card }],
    running: false,
    blocked: false,
    imported: true,
    unmatched: [],
    controller: null,
  };
  jest
    .mocked(importCards)
    .mockResolvedValue({ success: true, userId: 'user-a', importedIds: [] });
  await importLegacyBatch(
    scope,
    { client: new QueryClient(), active: { current: 'user-a' } },
    new AbortController().signal,
  );
  expect(jest.mocked(importCards)).toHaveBeenLastCalledWith(
    'user-a',
    [card],
    expect.anything(),
    true,
  );
  expect(JSON.parse(localStorage.getItem(STUDY_KEY)!)).toEqual([card]);
  expect(scope.queue).toEqual([]);
});

test('queues a source deletion when cards have not loaded and retries it', async () => {
  const scope: Scope = {
    userId: 'user-a',
    queue: [],
    running: false,
    blocked: false,
    imported: false,
    unmatched: [],
    controller: null,
  };
  const context = { client: new QueryClient(), active: { current: 'user-a' } };
  jest.mocked(deleteCardsForMessage).mockRejectedValueOnce(new Error('offline'));
  removeCardsForMessage(scope, context, 'message-id');
  await waitFor(() => expect(scope.blocked).toBe(true));
  expect(scope.queue).toEqual([{ kind: 'deleteSource', sourceMessageId: 'message-id' }]);
  expect(saveOutbox('user-a', scope.queue, 'tab-one')).toBe(true);
  const restored = loadOutbox('user-a', 'tab-one');
  expect(restored).toEqual(scope.queue);
  const removed = createFlashcards('message-id', corrected, languageConfig, 'Hello')[0]!;
  expect(applyPending([removed], scope.queue)).toEqual([]);
  const restoredScope = { ...scope, queue: restored, blocked: false, controller: null };
  jest
    .mocked(deleteCardsForMessage)
    .mockResolvedValueOnce({ success: true, userId: 'user-a', deleted: true });
  await processQueue(restoredScope, context);
  expect(restoredScope.queue).toEqual([]);
  expect(deleteCardsForMessage).toHaveBeenLastCalledWith(
    'user-a',
    'message-id',
    expect.anything(),
  );
});
