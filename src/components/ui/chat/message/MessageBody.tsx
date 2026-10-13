import type { ChatMessage } from '@/lib/types';
import type { LanguageConfig } from '@/lib/schemas';
import { CorrectionDiff } from './CorrectionDiff';
import { CorrectionExplanation } from './CorrectionExplanation';

interface MessageBodyProps {
  message: ChatMessage;
  config: LanguageConfig;
  translation: string | null;
  showTranslation: boolean;
  changed: boolean;
}

export function MessageBody(props: MessageBodyProps) {
  const correction =
    props.message.role === 'user' && props.changed ? props.message.correction : null;
  const text = props.showTranslation ? props.translation : props.message.content;
  let content: React.ReactNode = text;

  if (correction) {
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
        {correction && (
          <CorrectionExplanation
            issues={correction.issues}
            language={props.config.nativeLanguage}
          />
        )}
      </div>
    </>
  );
}
