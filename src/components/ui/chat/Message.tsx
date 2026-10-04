'use client';
import { useEffect, useRef, useState } from 'react';
import { Bot, User, Check, Copy, Languages, Trash2, RotateCcw } from 'lucide-react';
import { translateMessage } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';
import type { LanguageConfig } from '@/lib/schemas';
import { CorrectionDiff } from './CorrectionDiff';

interface MessageProps {
  message: ChatMessage;
  config: LanguageConfig;
  onDelete: () => void;
  onRetry: () => void;
  busy: boolean;
}

export function Message({ message, config, onDelete, onRetry, busy }: MessageProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      active.current?.abort();
    };
  }, []);
  const user = message.role === 'user';
  const correction = message.correction;
  const changed = correction && correction.correctedText !== message.content;
  async function handleTranslate() {
    if (translation) {
      setShowTranslation((isVisible) => !isVisible);
      return;
    }
    if (active.current) {
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setTranslating(true);
    setError('');
    try {
      const result = await translateMessage(message.content, config, controller.signal);
      if (!controller.signal.aborted) {
        setTranslation(result.translation);
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
      active.current = null;
    }
  }
  async function handleCopy() {
    let content = correction?.correctedText ?? message.content;

    if (showTranslation && translation) {
      content = translation;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setError('');
    } catch {
      setError('Copy failed. Select the text and copy it manually.');
    }
  }

  function getTranslationLabel() {
    if (translating) {
      return 'Translating…';
    }

    return showTranslation ? 'Show original' : 'Translate';
  }

  function getCopyLabel() {
    if (copied) {
      return 'Copied';
    }

    return changed ? 'Copy corrected' : 'Copy';
  }

  function renderContent() {
    if (user && changed) {
      return (
        <CorrectionDiff
          original={message.content}
          corrected={correction.correctedText}
          language={config.targetLanguage}
        />
      );
    }

    return showTranslation ? translation : message.content;
  }

  return (
    <article className={`message ${user ? 'message-user' : 'message-assistant'}`}>
      <p className="mb-3 flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {user ? <User size={15} /> : <Bot size={17} />} {user ? 'You' : 'LangBot'}
      </p>
      <div
        className="whitespace-pre-wrap break-words leading-relaxed"
        dir="auto"
        lang={showTranslation ? config.nativeLanguage : config.targetLanguage}
      >
        {renderContent()}
      </div>
      {user && message.status === 'pending' && (
        <p
          role="status"
          className="mt-2 text-xs text-gray-500"
        >
          Writing a reply and checking your sentence…
        </p>
      )}
      {user && correction === null && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Correction unavailable for this message.
        </p>
      )}
      {user && changed && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-[var(--muted)]">
            Why these changes?
          </summary>
          <ul
            className="mt-2 list-disc space-y-2 pl-5"
            lang={config.nativeLanguage}
            dir="auto"
          >
            {correction.issues.map((issue, index) => (
              <li key={index}>{issue.explanation}</li>
            ))}
          </ul>
        </details>
      )}
      {message.status === 'failed' && (
        <div
          className="mt-3"
          role="status"
        >
          <p className="text-sm text-red-700 dark:text-red-300">
            Reply and correction weren’t completed.
          </p>
          <button
            onClick={onRetry}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-2 text-xs disabled:opacity-40"
          >
            <RotateCcw size={14} /> Retry message
          </button>
        </div>
      )}
      <div className="message-actions">
        {!user && (
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="icon-button"
            aria-label={getTranslationLabel()}
            title={showTranslation ? 'Show original' : 'Translate'}
            aria-pressed={showTranslation}
          >
            <Languages
              size={15}
              className={translating ? 'animate-pulse' : ''}
            />
          </button>
        )}
        <button
          onClick={handleCopy}
          className="icon-button"
          aria-label={getCopyLabel()}
          title={copied ? 'Copied' : 'Copy text'}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
        <button
          onClick={onDelete}
          className="icon-button"
          aria-label={user ? 'Delete turn' : 'Delete'}
          title={user ? 'Delete turn' : 'Delete message'}
        >
          <Trash2 size={15} />
        </button>
        <time
          className="ml-2 text-[10px] text-[var(--muted)]"
          dateTime={message.timestamp.toISOString()}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
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
