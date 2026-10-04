import { useState, type FormEvent } from 'react';
import { ArrowRight, Languages } from 'lucide-react';
import { LANGUAGES, languageConfigSchema, type LanguageConfig } from '@/lib/schemas';

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
      <span className="welcome-mark">
        <Languages
          size={28}
          strokeWidth={1.5}
        />
      </span>
      <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
        A new language.
        <br />A little more you.
      </h2>
      <p className="text-sm leading-6 text-[var(--muted)]">
        A space to talk, make mistakes, and get better.
        <br />
        Let’s make it yours.
      </p>
      {initial && (
        <p className="text-sm text-gray-500">
          Starting with these languages begins a new chat. Your saved practice is kept for
          each language pair.
        </p>
      )}
      <label className="block text-xs font-medium text-[var(--muted)]">
        Your native language
        <select
          value={nativeLanguage}
          onChange={(e) => setNative(e.target.value as typeof nativeLanguage)}
          className="setup-select"
        >
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <option
              key={code}
              value={code}
            >
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-[var(--muted)]">
        Language to practise
        <select
          value={targetLanguage}
          onChange={(e) => setTarget(e.target.value as typeof targetLanguage)}
          className="setup-select"
        >
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <option
              key={code}
              value={code}
            >
              {name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p
          role="alert"
          className="text-red-600"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        className="primary-button flex w-full items-center justify-center gap-3"
      >
        Start practising <ArrowRight size={16} />
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full underline"
        >
          Back to chat
        </button>
      )}
    </form>
  );
}
