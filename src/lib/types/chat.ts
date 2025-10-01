export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

export type ConversationContext = {
  messages: ChatMessage[];
  learningLanguage: string;
  userLevel: string;
  topicsDiscussed: string[];
  commonMistakes: string[];
};

export interface ChatRequest {
  prompt: string;
  history?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  context?: {
    learningLanguage?: string;
    userLevel?: string;
    topicsDiscussed?: string[];
    commonMistakes?: string[];
  };
}