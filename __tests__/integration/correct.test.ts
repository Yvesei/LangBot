/**
 * @jest-environment node
 */


const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CORRECT_ENDPOINT = `${BASE_URL}/api/correct`;

describe('POST /api/correct - Integration Tests', () => {

  describe('Successful Corrections', () => {
    test('should correct spelling mistakes', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'I want to recieve the packege'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.correctedContent).toBeDefined();
      expect(typeof data.correctedContent).toBe('string');
      // Should correct 'recieve' to 'receive' and 'packege' to 'package'
      expect(data.correctedContent.toLowerCase()).toContain('receive');
      expect(data.correctedContent.toLowerCase()).toContain('package');
    }, 30000);

    test('should correct grammar mistakes', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'She go to school everyday'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.correctedContent).toBeDefined();
      // Should correct 'go' to 'goes'
      expect(data.correctedContent.toLowerCase()).toContain('goes');
    }, 30000);

    test('should return [CORRECT] for correct text', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'This is a perfectly correct sentence'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.correctedContent).toBe('[CORRECT]');
    }, 30000);

    test('should handle multiple sentences', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'I love programing. It is intresting and fun.'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.correctedContent).toBeDefined();
      // Should correct 'programin' to 'programming' and 'intresting' to 'interesting'
      expect(data.correctedContent.toLowerCase()).toContain('programming');
      expect(data.correctedContent.toLowerCase()).toContain('interesting');
    }, 30000);

    test('should preserve correct punctuation', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello! How are you? I am fine, thank you.'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      // Should preserve punctuation
      if (data.correctedContent !== '[CORRECT]') {
        expect(data.correctedContent).toMatch(/[.!?]/);
      }
    }, 30000);
  });

  describe('Validation Errors', () => {
    test('should return 400 for missing content', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('content is required');
    });

    test('should return 400 for empty content', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '   '
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
        fetch(CORRECT_ENDPOINT, {
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
        fetch(CORRECT_ENDPOINT, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('Method not allowed');
    });

    test('should return 405 for PUT requests', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'test' }),
        })
      );

      expect(response.status).toBe(405);
    });

    test('should return 405 for DELETE requests', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(405);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long text', async () => {
      const longText = 'This is a sentence with a mistake. '.repeat(50) + 'I love programing.';
      
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: longText
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle special characters', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'The price is $100.00 (including tax)'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle text with numbers', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'I have 3 apples and 2 oranges in my basket'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle text with line breaks', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Line 1\nLine 2\nLine 3'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle single word', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'proggraming'
          }),
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.correctedContent.toLowerCase()).toContain('programming');
    }, 30000);

    test('should handle text with emojis', async () => {
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'I love programing! 🎉 It is so much fun 😊'
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);
  });

  describe('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await global.rateCall(() =>
        fetch(CORRECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'This is a test sentance'
          }),
        })
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(10000); // Should respond within 10 seconds
    }, 30000);
  });
});
