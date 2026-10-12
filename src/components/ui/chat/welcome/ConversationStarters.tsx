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
    <div className="conversation-starters">
      {CONVERSATION_STARTERS.map(({ icon: Icon, title, prompt }) => (
        <button
          key={title}
          className="starter"
          onClick={() => onStartConversation(prompt)}
          disabled={loading}
        >
          <Icon
            size={23}
            strokeWidth={2}
          />
          <span>{title}</span>
          <ArrowUpRight
            size={20}
            className="ml-auto starter-arrow"
          />
        </button>
      ))}
    </div>
  );
}
