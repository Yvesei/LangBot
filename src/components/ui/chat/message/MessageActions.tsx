import { Check, Copy, Trash2 } from 'lucide-react';
import { TranslationButton } from './TranslationButton';

interface MessageActionsProps {
  user: boolean;
  changed: boolean;
  copied: boolean;
  translating: boolean;
  showTranslation: boolean;
  timestamp: Date;
  onTranslate: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function MessageActions(props: MessageActionsProps) {
  let copyLabel = props.changed ? 'Copy corrected' : 'Copy';

  if (props.copied) {
    copyLabel = 'Copied';
  }

  return (
    <div className="message-actions">
      {!props.user && <TranslationButton {...props} />}
      <button
        onClick={props.onCopy}
        className="icon-button"
        aria-label={copyLabel}
        title={props.copied ? 'Copied' : 'Copy text'}
      >
        {props.copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <button
        onClick={props.onDelete}
        className="icon-button"
        aria-label={props.user ? 'Delete turn' : 'Delete'}
        title={props.user ? 'Delete turn' : 'Delete message'}
      >
        <Trash2 size={15} />
      </button>
      <time
        className="ml-2 text-[10px] text-[var(--muted)]"
        dateTime={props.timestamp.toISOString()}
      >
        {props.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </time>
    </div>
  );
}
