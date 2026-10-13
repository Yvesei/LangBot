import { AudioLines } from 'lucide-react';
import { SendButton } from './SendButton';

interface ChatInputControlsProps {
  prompt: string;
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
  onVoiceCall: () => void;
}

export function ChatInputControls(props: ChatInputControlsProps) {
  return (
    <div className="flex items-center justify-end gap-2 px-1 pb-1 pt-2">
      <button
        type="button"
        onClick={props.onVoiceCall}
        disabled={props.disabled || props.loading}
        className="icon-button voice-trigger"
        aria-label="Voice call"
        title="Start a voice call"
      >
        <AudioLines size={23} />
        <span
          data-theme-content="neo"
          className="hidden sm:inline"
        >
          Talk
        </span>
      </button>
      <SendButton
        prompt={props.prompt}
        loading={props.loading}
        disabled={props.disabled}
        onCancel={props.onCancel}
      />
    </div>
  );
}
