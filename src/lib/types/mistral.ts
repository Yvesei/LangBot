export interface MistralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}