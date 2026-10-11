'use client';

import { useState } from 'react';
import { MessageAuthor } from './MessageAuthor';
import type { ChatMessage } from '@/lib/types';
import type { LanguageConfig } from '@/lib/schemas';
import { MessageActions } from './MessageActions';
import { MessageBody } from './MessageBody';
import { MessageNotices } from './MessageNotices';
import { useMessageCopy, useMessageTranslation } from './useMessageActions';

interface MessageProps {
  message: ChatMessage;
  config: LanguageConfig;
  onDelete: () => void;
  onRetry: () => void;
  busy: boolean;
}

export function Message({ message, config, onDelete, onRetry, busy }: MessageProps) {
  const [error, setError] = useState('');
  const translation = useMessageTranslation(message, config, setError);
  const clipboard = useMessageCopy({
    message,
    translation: translation.translation,
    showTranslation: translation.showTranslation,
    setError,
  });
  const user = message.role === 'user';
  const changed = Boolean(
    message.correction && message.correction.correctedText !== message.content,
  );

  return (
    <article className={`message ${user ? 'message-user' : 'message-assistant'}`}>
      <MessageAuthor user={user} />
      <MessageBody
        message={message}
        config={config}
        translation={translation.translation}
        showTranslation={translation.showTranslation}
        changed={changed}
      />
      <MessageNotices
        message={message}
        busy={busy}
        onRetry={onRetry}
      />
      <MessageActions
        user={user}
        changed={changed}
        copied={clipboard.copied}
        translating={translation.translating}
        showTranslation={translation.showTranslation}
        timestamp={message.timestamp}
        onTranslate={translation.translate}
        onCopy={clipboard.copy}
        onDelete={onDelete}
      />
      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
    </article>
  );
}
