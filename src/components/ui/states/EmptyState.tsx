import { useState, type FormEvent } from 'react';
import { languageConfigSchema, type LanguageConfig } from '@/lib/schemas';
import { LanguageField } from './LanguageField';
import { SetupActions, SetupIntroduction } from './SetupContent';

interface EmptyStateProps {
  initial: LanguageConfig | null;
  onLanguageSelect: (config: LanguageConfig) => void;
  onCancel?: () => void;
}

export function EmptyState({ initial, onLanguageSelect, onCancel }: EmptyStateProps) {
  const [nativeLanguage, setNative] = useState(initial?.nativeLanguage ?? 'fr');
  const [targetLanguage, setTarget] = useState(initial?.targetLanguage ?? 'en');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = languageConfigSchema.safeParse({
      nativeLanguage,
      targetLanguage,
    });

    if (!result.success) {
      setError('Choose two different languages.');
      return;
    }

    onLanguageSelect(result.data);
  }

  return (
    <form
      className="setup-form"
      onSubmit={handleSubmit}
    >
      <SetupIntroduction isChanging={Boolean(initial)} />
      <LanguageField
        label="Your native language"
        value={nativeLanguage}
        onChange={setNative}
      />
      <LanguageField
        label="Language to practise"
        value={targetLanguage}
        onChange={setTarget}
      />
      {error && (
        <p
          role="alert"
          className="text-red-600"
        >
          {error}
        </p>
      )}
      <SetupActions onCancel={onCancel} />
    </form>
  );
}
