import { useRef, useState } from 'react';
import type { ConversationMessage } from '@/lib/chat/conversation';
import type { LanguageConfig, Level } from '@/lib/schemas';
import type { ActiveChatRequest } from './chat-types';

export function useConfigurationState() {
  const [config, setConfig] = useState<LanguageConfig | null>(null);
  const [level, setLevel] = useState<Level>('beginner');
  const [isReady, setIsReady] = useState(false);
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);

  return {
    config,
    setConfig,
    level,
    setLevel,
    isReady,
    setIsReady,
    isSelectingLanguages,
    setIsSelectingLanguages,
  };
}

export function useConversationState() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return {
    prompt,
    setPrompt,
    messages,
    setMessages,
    loading,
    setLoading,
    error,
    setError,
    activeChatRequest,
    messagesEndRef,
  };
}

export function useStudyState() {
  const [storageWarning, setStorageWarning] = useState('');

  return {
    storageWarning,
    setStorageWarning,
  };
}
