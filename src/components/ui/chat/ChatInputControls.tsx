import { ArrowUp, AudioLines, Square } from 'lucide-react';

interface ChatInputControlsProps {
  prompt: string;
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
  onVoiceCall: () => void;
}

function SendButton(
  props: Pick<ChatInputControlsProps, 'prompt' | 'loading' | 'disabled' | 'onCancel'>,
) {
  if (props.loading) {
    return (
      <button
        type="button"
        onClick={props.onCancel}
        className="send-button"
        aria-label="Cancel reply"
        title="Stop reply"
      >
        <Square
          size={16}
          fill="currentColor"
        />
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={props.disabled || !props.prompt.trim()}
      className="send-button"
      aria-label="Send"
      title="Send message"
    >
      <ArrowUp size={20} />
    </button>
  );
}

export function ChatInputControls(props: ChatInputControlsProps) {
  const promptStatus = props.prompt.length
    ? `${props.prompt.length}/2000`
    : 'A little practice, every day.';

  return (
    <div className="flex items-center justify-between px-1 pb-1 pt-2">
      <span className="text-xs text-[var(--muted)]">{promptStatus}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onVoiceCall}
          disabled={props.disabled || props.loading}
          className="icon-button"
          aria-label="Voice call"
          title="Start a voice call"
        >
          <AudioLines size={21} />
        </button>
        <SendButton
          prompt={props.prompt}
          loading={props.loading}
          disabled={props.disabled}
          onCancel={props.onCancel}
        />
      </div>
    </div>
  );
}
