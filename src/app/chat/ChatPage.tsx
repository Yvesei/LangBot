'use client';

import { ChatHeader } from '@/components/ui/chat/ChatHeader';
import { ChatInput } from '@/components/ui/chat/ChatInput';
import { ChatConversation } from './ChatConversation';
import { ChatOverlays } from './ChatOverlays';
import { useChatActions } from './useChatActions';
import { useChatState } from './useChatState';

function ChatNotices({
  error,
  storageWarning,
}: {
  error: string;
  storageWarning: string;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {storageWarning && (
        <p
          role="status"
          className="mt-4 text-sm text-amber-700 dark:text-amber-300"
        >
          {storageWarning}
        </p>
      )}
    </>
  );
}

export default function ChatPage() {
  const state = useChatState();
  const actions = useChatActions(state);

  return (
    <div className="app-shell">
      <ChatHeader
        config={state.config}
        level={state.level}
        onLevelChange={actions.changeLevel}
        onNewChat={actions.newChat}
        onChangeLanguages={actions.changeLanguages}
      />
      <main className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 py-6 sm:px-6">
          <ChatConversation
            state={state}
            actions={actions}
          />
          <ChatNotices
            error={state.error}
            storageWarning={state.storageWarning}
          />
          <div ref={state.messagesEndRef} />
        </div>
      </main>
      <ChatInput
        prompt={state.prompt}
        setPrompt={state.setPrompt}
        loading={state.loading}
        onSend={actions.send}
        onCancel={actions.cancel}
        disabled={!state.isReady || !state.config || state.isSelectingLanguages}
      />
      <ChatOverlays
        state={state}
        actions={actions}
      />
    </div>
  );
}
