/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/translate/route';
import { NextRequest } from 'next/server';

// Mock the fetch function
global.fetch = jest.fn();

describe('/api/translate', () => {
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MISTRAL_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete process.env.MISTRAL_API_KEY;
  });

  describe('POST', () => {
    it('should return translated content', async () => {
      const mockAiResponse = {
        choices: [
          {
            message: {
              content: 'Hello, how are you?'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Bonjour, comment allez-vous?',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.translation).toBe('Hello, how are you?');
    });

    it('should include language config in system prompt', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Translated' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hola',
          languageConfig: {
            targetLanguage: 'Spanish',
            nativeLanguage: 'English'
          }
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[0].content).toContain('Spanish');
      expect(requestBody.messages[0].content).toContain('English');
      expect(requestBody.messages[0].content).toContain('translator');
    });

    it('should use temperature 0.0 for consistent translations', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Translation' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Text to translate',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.temperature).toBe(0.0);
      expect(requestBody.model).toBe('mistral-small-latest');
    });

    it('should handle different language pairs', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: '你好' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'English',
            nativeLanguage: 'Chinese'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.translation).toBe('你好');
    });

    it('should return 400 if content is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('content is required');
    });

    it('should return 400 if content is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: '   ',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('content is required');
    });

    it('should return 500 if API key is missing', async () => {
      delete process.env.MISTRAL_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('API configuration error');
    });

    it('should handle 401 authentication error from Mistral', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('API authentication failed');
    });

    it('should handle other Mistral API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('AI service temporarily unavailable');
    });

    it('should handle invalid response format from Mistral', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid response from AI service');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection timeout'));

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should trim whitespace from translation', async () => {
      const mockAiResponse = {
        choices: [
          {
            message: {
              content: '  Bonjour  '
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello',
          languageConfig: {
            targetLanguage: 'English',
            nativeLanguage: 'French'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.translation).toBe('Bonjour');
    });

    it('should preserve text formatting in translation', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Line 1\nLine 2\nLine 3' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Ligne 1\nLigne 2\nLigne 3',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.translation).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should instruct to keep same format in system prompt', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Translation' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text',
          languageConfig: {
            targetLanguage: 'French',
            nativeLanguage: 'English'
          }
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.messages[0].content).toContain('keep the same format');
      expect(requestBody.messages[0].content).toContain('no explanations');
      expect(requestBody.messages[0].content).toContain('no extra commentary');
    });
  });

  describe('GET', () => {
    it('should return 405 for GET requests', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });
});