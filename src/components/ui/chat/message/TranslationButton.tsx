import { Languages } from 'lucide-react';

interface TranslationButtonProps {
  translating: boolean;
  showTranslation: boolean;
  onTranslate: () => void;
}

function getTranslationLabel(props: TranslationButtonProps) {
  if (props.translating) {
    return 'Translating…';
  }

  return props.showTranslation ? 'Show original' : 'Translate';
}

export function TranslationButton(props: TranslationButtonProps) {
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
