import { createCard } from '@/lib/learning';
import { languageConfig } from '../../tests/fixtures';

test('keeps the correction and all explanations together for the flashcard', () => {
  const correction = {
    correctedText: 'I have an apple.',
    issues: [
      { category: 'grammar' as const, explanation: 'Use have with I.' },
      { category: 'grammar' as const, explanation: 'Use an before a vowel sound.' },
    ],
  };
  const card = createCard('message-1', correction, languageConfig, 'I has a apple.')!;
  expect(card).toMatchObject({
    originalText: 'I has a apple.',
    correctedText: 'I have an apple.',
    focus: 'Use have with I.\nUse an before a vowel sound.',
  });
});

test('valid sentences do not create unnecessary review cards', () => {
  expect(
    createCard('id', { correctedText: 'Hello.', issues: [] }, languageConfig),
  ).toBeNull();
});
