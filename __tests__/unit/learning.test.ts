import { createFlashcards } from '@/lib/learning';
import { languageConfig } from '../../tests/fixtures';

test('keeps the correction and all explanations together for the flashcard', () => {
  const correction = {
    correctedText: 'I have an apple.',
    issues: [
      { category: 'grammar' as const, explanation: 'Use have with I.' },
      { category: 'grammar' as const, explanation: 'Use an before a vowel sound.' },
    ],
  };
  const card = createFlashcards(
    'message-1',
    correction,
    languageConfig,
    'I has a apple.',
  )[0]!;
  expect(card).toMatchObject({
    originalText: 'I has a apple.',
    correctedText: 'I have an apple.',
    focus: 'Use have with I.\nUse an before a vowel sound.',
  });
});

test.each([null, { correctedText: 'Hello.', issues: [] }])(
  'creates no flashcards when a correction is unavailable or unnecessary',
  (correction) => {
    expect(createFlashcards('id', correction, languageConfig)).toEqual([]);
  },
);

test('uses one card for grammar and translated words in the same message', () => {
  const cards = createFlashcards(
    'id',
    {
      correctedText: 'She needs a spoon.',
      issues: [
        { category: 'grammar', explanation: 'Avec she, utilise needs.' },
        { category: 'translation', explanation: 'Une cuillère se dit a spoon.' },
      ],
    },
    languageConfig,
    'She need une cuillère.',
  );
  expect(cards).toHaveLength(1);
  expect(cards[0].focus).toBe('Avec she, utilise needs.\nUne cuillère se dit a spoon.');
});
