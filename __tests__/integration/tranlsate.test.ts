/**
 * @jest-environment node
 */


const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TRANSLATE_ENDPOINT = `${BASE_URL}/api/translate`;

describe('POST /api/translate - Integration Tests', () => {

  describe('Successful Translations', () => {
    test('should translate French to English', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Bonjour, comment allez-vous?',
            languageConfig: {
              targetLanguage: 'French',
              nativeLanguage: 'English'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      expect(typeof data.translation).toBe('string');
      expect(data.translation.length).toBeGreaterThan(0);
      // Should contain English greeting words
      expect(data.translation.toLowerCase()).toMatch(/hello|hi|good|how/);
    }, 30000);

    test('should translate English to Spanish', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello, how are you?',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'Spanish'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      // Should contain Spanish greeting
      expect(data.translation.toLowerCase()).toMatch(/hola|buenos|cómo|como/);
    }, 30000);

    test('should translate English to German', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Good morning',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'German'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      // Should contain German greeting
      expect(data.translation.toLowerCase()).toMatch(/guten|morgen/);
    }, 30000);

    test('should translate multiple sentences', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello. How are you? I am fine.',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      // Should have multiple sentences
      expect(data.translation.split(/[.!?]/).length).toBeGreaterThan(1);
    }, 30000);

    test('should preserve text formatting', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Line 1\nLine 2\nLine 3',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      // Should preserve line breaks
      expect(data.translation).toContain('\n');
    }, 30000);
  });

  describe('Validation Errors', () => {
    test('should return 400 for missing content', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            languageConfig: {
              targetLanguage: 'French',
              nativeLanguage: 'English'
            }
          }),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('content is required');
    });

    test('should return 400 for empty content', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '   ',
            languageConfig: {
              targetLanguage: 'French',
              nativeLanguage: 'English'
            }
          }),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('content is required');
    });

    test('should return 400 for invalid JSON', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
      );

      expect(response.status).toBe(400);
    });
  });

  describe('HTTP Methods', () => {
    test('should return 405 for GET requests', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('Method not allowed');
    });

    test('should return 405 for PUT requests', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'test',
            languageConfig: { targetLanguage: 'English', nativeLanguage: 'French' }
          }),
        })
      );

      expect(response.status).toBe(405);
    });

    test('should return 405 for DELETE requests', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(405);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long text', async () => {
      const longText = 'This is a sentence. '.repeat(100);
      
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: longText,
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle special characters', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '$100.00 & 50% off!',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      // Special characters should be preserved
      expect(data.translation).toMatch(/[$%&!]/);
    }, 30000);

    test('should handle numbers in text', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'I have 3 apples and 5 oranges',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'Spanish'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      // Numbers should be preserved
      expect(data.translation).toContain('3');
      expect(data.translation).toContain('5');
    }, 30000);

    test('should handle mixed case text', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'HELLO world! How ARE you?',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle single word', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.translation.toLowerCase()).toMatch(/bonjour|salut/);
    }, 30000);

    test('should handle punctuation marks', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello! How are you? I am fine.',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'Spanish'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      // Should preserve punctuation
      expect(data.translation).toMatch(/[!?.,]/);
    }, 30000);

    test('should handle text with emojis', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello! 👋 How are you? 😊',
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      // Emojis should be preserved
      expect(data.translation).toMatch(/[👋😊]/);
    }, 30000);

    test('should handle quotes and apostrophes', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: "It's a beautiful day. She said, \"Hello!\"",
            languageConfig: {
              targetLanguage: 'English',
              nativeLanguage: 'French'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle missing languageConfig gracefully', async () => {
      const response = await global.rateCall(() =>
        fetch(TRANSLATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello'
          }),
        })
      );

      // Should either succeed or fail gracefully, not crash
      expect([200, 400, 500]).toContain(response.status);
    });

  });

});
