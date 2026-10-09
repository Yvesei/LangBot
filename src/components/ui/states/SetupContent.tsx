import { ArrowRight, Languages } from 'lucide-react';

export function SetupIntroduction({ isChanging }: { isChanging: boolean }) {
  return (
    <>
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
      {isChanging && (
        <p className="text-sm text-gray-500">
          Starting with these languages begins a new chat.
        </p>
      )}
    </>
  );
}

export function SetupActions({ onCancel }: { onCancel?: () => void }) {
  return (
    <>
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
    </>
  );
}
