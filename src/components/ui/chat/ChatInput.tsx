import { useRef, useLayoutEffect, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, AudioLines, Square } from 'lucide-react';
import { MAX_MESSAGE_LENGTH } from '@/lib/config/limits';

interface ChatInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onSend: () => void;
  onCancel: () => void;
  onVoiceCall: () => void;
  disabled: boolean;
}

export function ChatInput({
  prompt,
  setPrompt,
  loading,
  onSend,
  onCancel,
  onVoiceCall,
  disabled,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.min(ref.current.scrollHeight, 180) + 'px';
    }
  }, [prompt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
    const shouldSend = event.key === 'Enter' && !event.shiftKey && !isComposing;

    if (shouldSend) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="composer-wrap"
    >
      <div className="mx-auto max-w-3xl">
        <label
          htmlFor="chat-message"
          className="sr-only"
        >
          Your message
        </label>
        <div className="composer">
          <textarea
            id="chat-message"
            ref={ref}
            value={prompt}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={disabled || loading}
            onKeyDown={handleKeyDown}
            placeholder="Say something. Make mistakes. Learn."
            className="min-h-12 w-full resize-none bg-transparent px-2 py-3 text-[15px] outline-none placeholder:text-[var(--muted)]"
          />
          <div className="flex items-center justify-between px-1 pb-1 pt-2">
            <span className="text-xs text-[var(--muted)]">
              {prompt.length ? `${prompt.length}/2000` : 'A little practice, every day.'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onVoiceCall}
                disabled={disabled || loading}
                className="icon-button"
                aria-label="Voice call"
                title="Start a voice call"
              >
                <AudioLines size={21} />
              </button>
              {loading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="send-button"
                  aria-label="Cancel reply"
                  title="Stop reply"
                >
                  <Square
                    size={16}
                    fill="currentColor"
                  />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={disabled || !prompt.trim()}
                  className="send-button"
                  aria-label="Send"
                  title="Send message"
                >
                  <ArrowUp size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
          AI suggestions can make mistakes.{' '}
          <span className="hidden sm:inline">Shift + Enter for a new line.</span>
        </p>
      </div>
    </form>
  );
}
