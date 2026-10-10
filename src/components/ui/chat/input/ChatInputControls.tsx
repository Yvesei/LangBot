import { SendButton } from './SendButton';

interface ChatInputControlsProps {
  prompt: string;
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
}

export function ChatInputControls(props: ChatInputControlsProps) {
  const promptStatus = props.prompt.length
    ? `${props.prompt.length}/2000`
    : 'A little practice, every day.';

  return (
    <div className="flex items-center justify-between px-1 pb-1 pt-2">
      <span className="text-xs text-[var(--muted)]">{promptStatus}</span>
      <div className="flex items-center gap-2">
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
