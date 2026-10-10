import { Bot } from 'lucide-react';
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
      <span className="welcome-mark">
        <Bot
          size={30}
          strokeWidth={1.4}
        />
      </span>
      <p className="mb-3 mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Your space to practise
      </p>
      <h2 className="text-3xl font-medium tracking-tight sm:text-[42px] sm:leading-tight">
        A conversation away
        <br />
        from better {LANGUAGES[config.targetLanguage]}.
      </h2>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
        Talk about anything. Get gentle corrections.
        <br />
        Build confidence, one message at a time.
      </p>
      <ConversationStarters
        loading={loading}
        onStartConversation={onStartConversation}
      />
      <p className="mt-6 text-[11px] text-[var(--muted)]">Chats last this visit.</p>
    </div>
  );
}
