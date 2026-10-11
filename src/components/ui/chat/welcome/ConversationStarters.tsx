import { ArrowUpRight, Coffee, Compass, MessageCircle } from 'lucide-react';

interface ConversationStartersProps {
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

export function ConversationStarters({
  loading,
  onStartConversation,
}: ConversationStartersProps) {
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
