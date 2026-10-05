import { ArrowUpRight, Bot, Coffee, Compass, MessageCircle } from 'lucide-react';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

interface ConversationWelcomeProps {
  config: LanguageConfig;
  loading: boolean;
  onStartConversation: (prompt: string) => void;
}

const CONVERSATION_STARTERS = [
  {
    icon: Coffee,
    title: 'My day',
    prompt: 'Help me talk about my day.',
  },
  {
    icon: Compass,
    title: 'Somewhere new',
    prompt: 'Let’s practise a conversation while travelling.',
  },
  {
    icon: MessageCircle,
    title: 'Just a conversation',
    prompt: 'Ask me a question to start a casual conversation.',
  },
];

function ConversationStarters({
  loading,
  onStartConversation,
}: Pick<ConversationWelcomeProps, 'loading' | 'onStartConversation'>) {
  return (
    <div className="mt-8 grid w-full gap-2 text-left sm:grid-cols-3">
      {CONVERSATION_STARTERS.map(({ icon: Icon, title, prompt }) => (
        <button
          key={title}
          className="starter"
          onClick={() => onStartConversation(prompt)}
          disabled={loading}
        >
          <Icon
            size={17}
            strokeWidth={1.6}
          />
          <span>{title}</span>
          <ArrowUpRight
            size={14}
            className="ml-auto opacity-40"
          />
        </button>
      ))}
    </div>
  );
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
      <p className="mt-6 text-[11px] text-[var(--muted)]">
        Chats last this visit. Saved practice stays with you.
      </p>
    </div>
  );
}
