import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ChatInputControls } from './ChatInputControls';
import { ChatInputField } from './ChatInputField';

interface ChatInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onSend: () => void;
  onCancel: () => void;
  onVoiceCall: () => void;
  disabled: boolean;
}

export function ChatInput(props: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 180) + 'px';
    }
  }, [props.prompt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;

    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      props.onSend();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="composer-wrap"
    >
      <div className="mx-auto max-w-3xl">
        <div className="composer">
          <ChatInputField
            inputRef={inputRef}
            prompt={props.prompt}
            setPrompt={props.setPrompt}
            disabled={props.disabled || props.loading}
            onKeyDown={handleKeyDown}
          />
          <ChatInputControls {...props} />
        </div>
        <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
          AI suggestions can make mistakes.{' '}
          <span className="hidden sm:inline">Shift + Enter for a new line.</span>
        </p>
      </div>
    </form>
  );
}
