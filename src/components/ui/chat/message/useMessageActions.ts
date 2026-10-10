import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { translateMessage } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';
import type { LanguageConfig } from '@/lib/schemas';

export function useMessageTranslation(
  message: ChatMessage,
  config: LanguageConfig,
  setError: Dispatch<SetStateAction<string>>,
) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, []);

  async function translate() {
    if (translation) {
      setShowTranslation((isVisible) => !isVisible);
      return;
    }

    if (activeRequest.current) {
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setTranslating(true);
    setError('');

    try {
      const response = await translateMessage(message.content, config, controller.signal);

      if (!controller.signal.aborted) {
        setTranslation(response.translation);
        setShowTranslation(true);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof Error ? error.message : 'Translation failed. Please retry.',
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setTranslating(false);
      }

      activeRequest.current = null;
    }
  }

  return {
    translation,
    showTranslation,
    translating,
    translate,
  };
}

interface CopyOptions {
  message: ChatMessage;
  translation: string | null;
  showTranslation: boolean;
  setError: Dispatch<SetStateAction<string>>;
}

export function useMessageCopy(options: CopyOptions) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const originalContent =
      options.message.correction?.correctedText ?? options.message.content;
    const content =
      options.showTranslation && options.translation
        ? options.translation
        : originalContent;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      options.setError('');
    } catch {
      options.setError('Copy failed. Select the text and copy it manually.');
    }
  }

  return {
    copied,
    copy,
  };
}
