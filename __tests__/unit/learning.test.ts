import { createCard, recordPractice } from '@/lib/learning';
import { corrected, languageConfig } from '../../tests/fixtures';

test('schedules a corrected mistake now, advances successful reviews, and revisits failures', () => {
  const card = createCard('message-1', corrected, languageConfig, 1000)!;
  expect(card.dueAt).toBe(1000);
  const first = recordPractice(card, true, 2000);
  expect(first.dueAt).toBe(2000 + 86400000);
  const second = recordPractice(first, true, 3000);
  expect(second.dueAt).toBe(3000 + 3 * 86400000);
  const failed = recordPractice(second, false, 4000);
  expect(failed.dueAt).toBe(4000 + 600000);
  expect(failed.streak).toBe(0);
  expect(failed.attempts).toBe(3);
  expect(failed.successes).toBe(2);
});
test('valid sentences do not create unnecessary practice', () => {
  expect(
    createCard(
      'id',
      { correctedText: 'Hello.', issues: [], exercise: null },
      languageConfig,
    ),
  ).toBeNull();
});
