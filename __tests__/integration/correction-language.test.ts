import { POST as chat } from '@/app/api/chat/route';
import { POST as correct } from '@/app/api/correct/route';
import { createFlashcards } from '@/lib/learning';
import { LANGUAGES } from '@/lib/schemas';
import { providerResponse, request } from '../../tests/fixtures';

jest.mock('@/lib/server/limits', () => ({
  enforceLimits: jest.fn().mockResolvedValue(undefined),
}));

const scenarios = [
  {
    languageConfig: { nativeLanguage: 'en', targetLanguage: 'es' } as const,
    original: 'Yo tiene una manzana.',
    correctedText: 'Yo tengo una manzana.',
    explanation: 'With “yo”, use “tengo”, the first-person form of “tener”.',
    reply: '¿Qué fruta te gusta?',
  },
  {
    languageConfig: { nativeLanguage: 'es', targetLanguage: 'en' } as const,
    original: 'I has an apple.',
    correctedText: 'I have an apple.',
    explanation: 'Con «I», se usa «have», no «has».',
    reply: 'What fruit do you like?',
  },
  {
    languageConfig: { nativeLanguage: 'fr', targetLanguage: 'es' } as const,
    original: 'Yo tiene una manzana.',
    correctedText: 'Yo tengo una manzana.',
    explanation: 'Avec «yo», utilise «tengo», la première personne de «tener».',
    reply: '¿Qué fruta te gusta?',
  },
];

beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, MISTRAL_API_KEY: 'test-key' });
  jest.spyOn(global, 'fetch');
});

afterEach(() => jest.restoreAllMocks());

describe.each([
  { path: 'chat', handler: chat },
  { path: 'correct', handler: correct },
])('$path correction languages', ({ path, handler }) => {
  test.each(scenarios)(
    '$languageConfig.nativeLanguage → $languageConfig.targetLanguage keeps explanations in the native language',
    async ({ languageConfig, original, correctedText, explanation, reply }) => {
      const correction = {
        correctedText,
        issues: [{ category: 'grammar', explanation }],
      };
      const output = path === 'chat' ? { reply, correction } : correction;
      jest.mocked(fetch).mockResolvedValue(providerResponse(output));
      const content = path === 'chat' ? { prompt: original } : { content: original };

      const response = await handler(
        request({ ...content, languageConfig, userLevel: 'beginner' }, path),
      );
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.correction).toEqual(correction);
      expect(fetch).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string);
      const properties = sent.response_format.json_schema.schema.properties;
      const correctionProperties =
        path === 'chat' ? properties.correction.properties : properties;
      expect(correctionProperties.issues.description).toContain(
        `${LANGUAGES[languageConfig.nativeLanguage]} (${languageConfig.nativeLanguage})`,
      );
      expect(correctionProperties.correctedText.description).toContain(
        `${LANGUAGES[languageConfig.targetLanguage]} (${languageConfig.targetLanguage})`,
      );
      expect(sent.messages[0].content).toContain(
        `Write EVERY issues[].explanation in ${LANGUAGES[languageConfig.nativeLanguage]}`,
      );
      if (path === 'chat') {
        expect(result.reply).toBe(reply);
        expect(properties.reply.description).toContain(
          `${LANGUAGES[languageConfig.targetLanguage]} (${languageConfig.targetLanguage})`,
        );
      }
      expect(
        createFlashcards('message', result.correction, languageConfig, original),
      ).toEqual([
        expect.objectContaining({
          languageConfig,
          originalText: original,
          correctedText,
          focus: explanation,
        }),
      ]);
    },
  );
});
