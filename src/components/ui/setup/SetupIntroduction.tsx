import { Languages } from 'lucide-react';

export function SetupIntroduction({ isChanging }: { isChanging: boolean }) {
  return (
    <>
      <span className="welcome-mark">
        <Languages
          size={28}
          strokeWidth={2.2}
        />
      </span>
      <h2 className="setup-title">
        <span data-theme-content="neo">
          Pick a language.
          <br />
          Make it yours.
        </span>
        <span data-theme-content="original">
          A new language.
          <br />A little more you.
        </span>
      </h2>
      <p className="text-base leading-relaxed text-[var(--muted)]">
        <span data-theme-content="neo">
          Choose your languages. We’ll handle the conversation.
        </span>
        <span data-theme-content="original">
          A space to talk, make mistakes, and get better.
          <br />
          Let’s make it yours.
        </span>
      </p>
      {isChanging && (
        <p className="text-base text-[var(--muted)]">
          Starting with these languages begins a new chat.
        </p>
      )}
    </>
  );
}
