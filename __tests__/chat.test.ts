/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

// Mock the fetch function
global.fetch = jest.fn();

describe('/api/chat', () => {
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MISTRAL_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete process.env.MISTRAL_API_KEY;
  });

  describe('POST', () => {
    it('should return a successful response with AI message', async () => {
      const mockAiResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How are you doing today?'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello',
          history: [],
          context: {}
        }),
      });

      const response = await POST(request);
      const data = await response.json();
console.log('Response status:', response.status);
console.log('Data:', data);
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Hello! How are you doing today?');
    });

    it('should include conversation history in the API call', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Great to hear!' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'I am doing well',
          history,
          context: {}
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.messages).toHaveLength(4); // system + 2 history + current
      expect(requestBody.messages[1].content).toBe('Hello');
      expect(requestBody.messages[2].content).toBe('Hi there!');
    });

    it('should limit history to last 8 messages', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Response' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const history = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Current message',
          history,
          context: {}
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.messages).toHaveLength(10); // system + 8 history + current
    });

    it('should add language context to system prompt', async () => {
      const mockAiResponse = {
        choices: [{ message: { content: 'Response' } }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Bonjour',
          history: [],
          context: {
            learningLanguage: 'French',
            userLevel: 'Intermediate'
          }
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.messages[0].content).toContain('French');
      expect(requestBody.messages[0].content).toContain('Intermediate');
    });

    it('should return 400 if prompt is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          history: [],
          context: {}
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Prompt is required');
    });

    it('should return 400 if prompt is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '   ',
          history: [],
          context: {}
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 500 if API key is missing', async () => {
      delete process.env.MISTRAL_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello',
          history: [],
          context: {}
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello',
          history: [],
          context: {}
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello',
          history: [],
          context: {}
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

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello',
          history: [],
          context: {}
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid response from AI service');
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello',
          history: [],
          context: {}
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
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