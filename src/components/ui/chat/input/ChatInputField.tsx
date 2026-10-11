import type { KeyboardEvent, RefObject } from 'react';
import { MAX_MESSAGE_LENGTH } from '@/lib/config/limits';

interface ChatInputFieldProps {
  prompt: string;
  setPrompt: (value: string) => void;
  disabled: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

export function ChatInputField(props: ChatInputFieldProps) {
  return (
    <>
      <label
        htmlFor="chat-message"
        className="sr-only"
      >
        Your message
      </label>
      <textarea
        id="chat-message"
        ref={props.inputRef}
        value={props.prompt}
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        onChange={(event) => props.setPrompt(event.target.value)}
        disabled={props.disabled}
        onKeyDown={props.onKeyDown}
        placeholder="Say something. Make mistakes. Learn."
        className="min-h-12 w-full resize-none bg-transparent px-2 py-3 text-[15px] outline-none placeholder:text-[var(--muted)]"
      />
    </>
  );
}
