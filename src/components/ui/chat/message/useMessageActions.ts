import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { translateMessage } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';
import type { LanguageConfig } from '@/lib/schemas';

export function useMessageTranslation(message: ChatMessage, config: LanguageConfig) {
  const [showTranslation, setShowTranslation] = useState(false);
  const query = useQuery({
    queryKey: [
      'translation',
      message.id,
      message.content,
      config.nativeLanguage,
      config.targetLanguage,
    ],

    queryFn: ({ signal }) => translateMessage(message.content, config, signal),
    enabled: false,
    staleTime: 5 * 60_000,
  });
  const translation = query.data?.translation ?? null;

  async function translate() {
    if (translation) {
      setShowTranslation((isVisible) => !isVisible);
      return;
    }

    if (query.isFetching) {
      return;
    }

    const result = await query.refetch();
    if (result.data) {
      setShowTranslation(true);
    } else if (result.error) {
      toast.error(
        result.error instanceof Error
          ? result.error.message
          : 'Translation failed. Please retry.',
      );
    }
  }

  return {
    translation,
    showTranslation,
    translating: query.isFetching,
    translate,
  };
}

interface CopyOptions {
  message: ChatMessage;
  translation: string | null;
  showTranslation: boolean;
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
    } catch {
      toast.error('Copy failed. Select the text and copy it manually.');
    }
  }

  return {
    copied,
    copy,
  };
}
