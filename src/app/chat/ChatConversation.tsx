import { ConversationWelcome } from '@/components/ui/chat/ConversationWelcome';
import { Message } from '@/components/ui/chat/Message';
import { EmptyState } from '@/components/ui/states/EmptyState';
import type { ChatActions } from './useChatActions';
import type { ChatState } from './useChatState';

interface ChatConversationProps {
  state: ChatState;
  actions: ChatActions;
}

function Messages({ state, actions }: ChatConversationProps) {
  return (
    <>
      {state.messages.length === 0 && (
        <ConversationWelcome
          config={state.config!}
          loading={state.loading}
          onStartConversation={actions.sendSpoken}
        />
      )}
      <div className="space-y-5">
        {state.messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            config={state.config!}
            busy={state.loading}
            onDelete={() => actions.deleteMessage(message.id)}
            onRetry={() => actions.retry(message)}
          />
        ))}
      </div>
    </>
  );
}

export function ChatConversation({ state, actions }: ChatConversationProps) {
  if (!state.isReady) {
    return <p role="status">Loading your preferences…</p>;
  }
  if (!state.config || state.isSelectingLanguages) {
    return (
      <EmptyState
        initial={state.config}
        onLanguageSelect={actions.selectLanguages}
        onCancel={state.config ? () => state.setIsSelectingLanguages(false) : undefined}
      />
    );
  }

  return (
    <>
      {state.topics.length > 0 && (
        <p
          className="mb-6 text-xs text-[var(--muted)]"
          lang={state.config.nativeLanguage}
        >
          {state.topics.join(' / ')}
        </p>
      )}
      <Messages
        state={state}
        actions={actions}
      />
    </>
  );
}
