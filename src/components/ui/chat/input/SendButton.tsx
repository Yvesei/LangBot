import { ArrowUp, Square } from 'lucide-react';

interface SendButtonProps {
  prompt: string;
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
}

export function SendButton(props: SendButtonProps) {
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
