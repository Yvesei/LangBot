import { useRef } from 'react';
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
  const loadingOlder = useRef<{ chat: string | null; user: string | undefined } | null>(
    null,
  );

  async function showOlder() {
    const request = {
      chat: state.history.id,
      user: state.auth.session?.user.id,
    };
    if (
      loadingOlder.current?.chat === request.chat &&
      loadingOlder.current.user === request.user
    ) {
      return;
    }
    loadingOlder.current = request;
    const container = state.messagesEndRef.current?.closest('main');
    const previousHeight = container?.scrollHeight ?? 0;
    state.preserveScrollRef.current = true;
    const result = await state.history.loadOlder();
    if (loadingOlder.current !== request) {
      return;
    }
    loadingOlder.current = null;
    requestAnimationFrame(() => {
      state.preserveScrollRef.current = false;
      if (container && result === 'done') {
        container.scrollTop += container.scrollHeight - previousHeight;
      }
    });
  }

  if (!state.isReady) {
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
