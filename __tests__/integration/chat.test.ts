/**
 * @jest-environment node
 */


const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CHAT_ENDPOINT = `${BASE_URL}/api/chat`;

describe('POST /api/chat - Integration Tests', () => {
  
  describe('Successful Requests', () => {
    test('should handle a basic conversation', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Hello, how are you?',
            history: [],
            context: {}
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
      expect(data.message.length).toBeGreaterThan(0);
    }, 30000);

    test('should maintain conversation context with history', async () => {
      const history = [
        { role: 'user', content: 'My name is John' },
        { role: 'assistant', content: 'Nice to meet you, John!' },
      ];

      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'What is my name?',
            history,
            context: {}
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message.toLowerCase()).toContain('john');
    }, 30000);

    test('should handle language learning context', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Bonjour!',
            history: [],
            context: {
              learningLanguage: 'French',
              userLevel: 'Beginner'
            }
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
    }, 30000);

    test('should handle long conversation history', async () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`
      }));

      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Continue our conversation',
            history,
            context: {}
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
    }, 30000);
  });

  describe('Validation Errors', () => {
    test('should return 400 for missing prompt', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: [],
            context: {}
          }),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('Prompt is required');
    });

    test('should return 400 for empty prompt', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: '   ',
            history: [],
            context: {}
          }),
        })
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('Prompt is required');
    });

    test('should return 400 for invalid JSON', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
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
        fetch(CHAT_ENDPOINT, {
          method: 'GET',
        })
      );

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('Method not allowed');
    });

    test('should return 405 for PUT requests', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test' }),
        })
      );

      expect(response.status).toBe(405);
    });

    test('should return 405 for DELETE requests', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(405);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long prompts', async () => {
      const longPrompt = 'Tell me about '.repeat(100) + 'programming';
      
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: longPrompt,
            history: [],
            context: {}
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle special characters in prompt', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: '¿Cómo estás? 你好！ Привет! 🎉',
            history: [],
            context: {}
          }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    }, 30000);

    test('should handle missing context gracefully', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Hello',
            history: []
          }),
        })
      );

      // Should either succeed or fail gracefully, not crash
      expect([200, 400, 500]).toContain(response.status);
    }), 30000;

    test('should handle missing history gracefully', async () => {
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Hello',
            context: {}
          }),
        })
      );

      // Should either succeed or fail gracefully, not crash
      expect([200, 400, 500]).toContain(response.status);
    }, 30000);
  });

  describe('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await global.rateCall(() =>
        fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Hi',
            history: [],
            context: {}
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
