import { useEffect, useRef, useState } from 'react';
import type { ConversationMessage } from '@/lib/chat/conversation';
import { getLanguageConfigFromStorage, getLevelFromStorage } from '@/lib/config/language';
import type { LanguageConfig, Level } from '@/lib/schemas';

interface ActiveChatRequest {
  controller: AbortController;
  messageId: string;
}

export function useChatState() {
  const [config, setConfig] = useState<LanguageConfig | null>(null);
  const [level, setLevel] = useState<Level>('beginner');
  const [isReady, setIsReady] = useState(false);
  const [isSelectingLanguages, setIsSelectingLanguages] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const activeChatRequest = useRef<ActiveChatRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requestRef = activeChatRequest;
    setConfig(getLanguageConfigFromStorage());
    setLevel(getLevelFromStorage());
    setIsReady(true);

    return () => {
      requestRef.current?.controller.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return {
    config,
    setConfig,
    level,
    setLevel,
    isReady,
    setIsReady,
    isSelectingLanguages,
    setIsSelectingLanguages,
    prompt,
    setPrompt,
    messages,
    setMessages,
    loading,
    setLoading,
    error,
    setError,
    storageWarning,
    setStorageWarning,
    activeChatRequest,
    messagesEndRef,
  };
}

export type ChatState = ReturnType<typeof useChatState>;
