import { Check, Copy, Languages, Trash2 } from 'lucide-react';

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

function getTranslationLabel(props: MessageActionsProps) {
  if (props.translating) {
    return 'Translating…';
  }

  return props.showTranslation ? 'Show original' : 'Translate';
}

function TranslationButton(props: MessageActionsProps) {
  const label = getTranslationLabel(props);

  return (
    <button
      onClick={props.onTranslate}
      disabled={props.translating}
      className="icon-button"
      aria-label={label}
      title={props.showTranslation ? 'Show original' : 'Translate'}
      aria-pressed={props.showTranslation}
    >
      <Languages
        size={15}
        className={props.translating ? 'animate-pulse' : ''}
      />
    </button>
  );
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
