import type { ChatMessage } from '@/lib/types';
import type { LanguageConfig } from '@/lib/schemas';
import { CorrectionDiff } from './CorrectionDiff';

interface MessageBodyProps {
  message: ChatMessage;
  config: LanguageConfig;
  translation: string | null;
  showTranslation: boolean;
  changed: boolean;
}

export function MessageBody(props: MessageBodyProps) {
  const correction = props.message.correction;
  let content: React.ReactNode = props.showTranslation
    ? props.translation
    : props.message.content;

  if (props.message.role === 'user' && props.changed && correction) {
    content = (
      <CorrectionDiff
        original={props.message.content}
        corrected={correction.correctedText}
        language={props.config.targetLanguage}
      />
    );
  }

  return (
    <>
      <div
        className="whitespace-pre-wrap break-words leading-relaxed"
        dir="auto"
        lang={
          props.showTranslation
            ? props.config.nativeLanguage
            : props.config.targetLanguage
        }
      >
        {content}
      </div>
      {props.message.role === 'user' && props.changed && correction && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-[var(--muted)]">
            Why these changes?
          </summary>
          <ul
            className="mt-2 list-disc space-y-2 pl-5"
            lang={props.config.nativeLanguage}
            dir="auto"
          >
            {correction.issues.map((issue, index) => (
              <li key={index}>{issue.explanation}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
