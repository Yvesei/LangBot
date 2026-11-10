import { ConversationWelcome } from '@/components/ui/chat/welcome/ConversationWelcome';
import { LoadingIndicator } from '@/components/ui/feedback/LoadingIndicator';
import { Message } from '@/components/ui/chat/message/Message';
import { EmptyState } from '@/components/ui/setup/EmptyState';
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
  async function showOlder() {
    const container = state.messagesEndRef.current?.closest('main');
    const previousHeight = container?.scrollHeight ?? 0;
    state.preserveScrollRef.current = true;
    await state.history.loadOlder();
    requestAnimationFrame(() => {
      state.preserveScrollRef.current = false;
      if (container) {
        container.scrollTop += container.scrollHeight - previousHeight;
      }
    });
  }

  if (!state.isReady) {
    if (state.auth.error) {
      return <p role="alert">{state.auth.error}</p>;
    }
    if (state.history.error || state.preferencesError) {
      return (
        <div className="chat-loading">
          <button
            type="button"
            className="chat-loading-retry"
            onClick={state.history.error ? state.history.retry : state.retryPreferences}
            aria-label="Loading failed. Retry"
            title="Loading failed. Retry"
          >
            <span aria-hidden="true">
              <LoadingIndicator />
            </span>
          </button>
        </div>
      );
    }
    return (
      <div className="chat-loading">
        <LoadingIndicator />
      </div>
    );
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
      {state.history.hasOlder && (
        <button
          type="button"
          onClick={() => void showOlder()}
        >
          Load earlier messages
        </button>
      )}
      <Messages
        state={state}
        actions={actions}
      />
    </>
  );
}
