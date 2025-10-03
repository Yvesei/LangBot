/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/correct/route';
import { NextRequest } from 'next/server';

// Mock the fetch function
global.fetch = jest.fn();

describe('/api/correct', () => {
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MISTRAL_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete process.env.MISTRAL_API_KEY;
  });

  describe('POST', () => {
    it('should return corrected content when there are mistakes', async () => {
      const mockAiResponse = {
        choices: [
          {
            message: {
              content: 'This is the correct version of the text.'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'This is the incorect version of the text.'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.correctedContent).toBe('This is the correct version of the text.');
    });

    it('should return [CORRECT] when text has no mistakes', async () => {
      const mockAiResponse = {
        choices: [
          {
            message: {
              content: '[CORRECT]'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'This is a perfect sentence.'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.correctedContent).toBe('[CORRECT]');
    });

    it('should use temperature 0.0 for consistent corrections', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Corrected text' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.temperature).toBe(0.0);
      expect(requestBody.model).toBe('mistral-small-latest');
    });

    it('should include correction instructions in system message', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Corrected' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test content'
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[0].content).toContain('text correction assistant');
      expect(requestBody.messages[1].role).toBe('user');
      expect(requestBody.messages[1].content).toBe('Test content');
    });

    it('should return 400 if content is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('content is required');
    });

    it('should return 400 if content is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: '   '
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

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
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

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
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
        status: 503,
        text: async () => 'Service Unavailable',
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('AI service temporarily unavailable');
    });

    it('should handle invalid response format from Mistral', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid response from AI service');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should trim whitespace from corrected content', async () => {
      const mockAiResponse = {
        choices: [
          {
            message: {
              content: '  Corrected text with spaces  '
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/correct', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Some text'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.correctedContent).toBe('Corrected text with spaces');
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