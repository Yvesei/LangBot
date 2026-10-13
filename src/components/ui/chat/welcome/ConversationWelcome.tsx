import { Logo } from '@/components/ui/brand/Logo';
import { ConversationStarters } from './ConversationStarters';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

interface ConversationWelcomeProps {
  config: LanguageConfig;
  loading: boolean;
  onStartConversation: (prompt: string) => void;
}

export function ConversationWelcome({
  config,
  loading,
  onStartConversation,
}: ConversationWelcomeProps) {
  return (
    <div className="welcome">
      <span
        className="welcome-mark"
        aria-hidden="true"
      >
        <Logo />
      </span>
      <p className="eyebrow">Your space to practise</p>
      <h2 className="welcome-title">
        <span data-theme-content="neo">
          Let’s talk
          <br />
          <span className="welcome-highlight">{LANGUAGES[config.targetLanguage]}.</span>
        </span>
        <span data-theme-content="original">
          A conversation away
          <br />
          from better {LANGUAGES[config.targetLanguage]}.
        </span>
      </h2>
      <p className="welcome-copy">
        <span data-theme-content="neo">Real conversations. Helpful corrections.</span>
        <span data-theme-content="original">
          Talk about anything. Get gentle corrections.
          <br />
          Build confidence, one message at a time.
        </span>
      </p>
      <ConversationStarters
        loading={loading}
        onStartConversation={onStartConversation}
      />
    </div>
  );
}
