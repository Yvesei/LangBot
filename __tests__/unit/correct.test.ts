import { wordDiff } from '@/lib/diff';
import { validateCorrection } from '@/lib/schemas';
import { corrected } from '../../tests/fixtures';

describe('correction diff', () => {
  test.each([
    ['I has a apple.', 'I have an apple.', 'en'],
    ['I like cats.', 'I really like cats.', 'en'],
    ['I really like cats.', 'I like cats.', 'en'],
    ['Bonjour\n  Maya! 😊', 'Bonjour\n  Maya ! 😊', 'fr'],
    ['我喜欢猫。', '我很喜欢猫。', 'zh'],
    ['私は猫が好き。', '私は犬が好き。', 'ja'],
    ['أنا يحب القراءة.', 'أنا أحب القراءة.', 'ar'],
    ['<script>alert(1)</script>', '<script>alert(2)</script>', 'en'],
    ['', 'Hello', 'en'],
    ['Hello', '', 'en'],
    ['unchanged', 'unchanged', 'en'],
    ['a '.repeat(1100), 'b '.repeat(1100), 'en'],
  ])('preserves both sides losslessly', (original, replacement, locale) => {
    const parts = wordDiff(original, replacement, locale);
    expect(
      parts
        .filter((p) => p.type !== 'added')
        .map((p) => p.text)
        .join(''),
    ).toBe(original);
    expect(
      parts
        .filter((p) => p.type !== 'removed')
        .map((p) => p.text)
        .join(''),
    ).toBe(replacement);
  });
  test('marks the changed word, not the whole sentence', () => {
    const parts = wordDiff('She go home.', 'She goes home.');
    expect(parts.find((p) => p.type === 'removed')?.text).toBe('go');
    expect(parts.find((p) => p.type === 'added')?.text).toBe('goes');
    expect(parts[0]).toEqual({ type: 'equal', text: 'She ' });
  });
  test('rejects contradictory corrections', () => {
    expect(validateCorrection('I has a apple.', corrected)).toBe(true);
    expect(validateCorrection('I have an apple.', corrected)).toBe(false);
    expect(validateCorrection('I has a apple.', { ...corrected, issues: [] })).toBe(
      false,
    );
    expect(
      validateCorrection('Hello.', {
        correctedText: 'Hello.',
        issues: [],
      }),
    ).toBe(true);
  });
});
