'use client';

import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast, Toaster } from 'sonner';
import { AuthSessionProvider } from '@/lib/auth/client';
import { ChatLayout } from '@/components/ui/chat/sidebar/ChatLayout';
import { GuestMessageLimitPrompt } from '@/components/ui/chat/GuestMessageLimitPrompt';
import { ChatInput } from '@/components/ui/chat/input/ChatInput';
import { ReviewDialog } from '@/components/ui/review/dialog/ReviewDialog';
import { VoiceCall } from '@/components/ui/voice/VoiceCall';
import { ChatConversation } from './ChatConversation';
import { useChatActions } from './useChatActions';
import { useChatState, type ChatState } from './useChatState';

function isChatInputDisabled(state: ChatState) {
  return (
    !state.isReady ||
    !state.config ||
    state.isSelectingLanguages ||
    state.auth.isLoading ||
    state.isGuestLimitReached
  );
}

function ChatNotices({ state }: { state: ChatState }) {
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const notices = [
      {
        id: 'auth',
        message: state.auth.error,

        retry: () => latest.current.auth.retry?.(),
      },
      {
        id: 'settings',
        message: state.preferencesError,

        retry: () => latest.current.retryPreferences(),
      },
      {
        id: 'chats',
        message: state.history.error,

        retry: () => latest.current.history.retry(),
      },
      {
        id: 'chat-error',
        message: state.error,
      },
      {
        id: 'storage',
        message: state.storageWarning,
        retry: state.hasPreferenceSaveError
          ? () => latest.current.retrySavePreferences()
          : undefined,
      },
    ];
    for (const notice of notices) {
      if (notice.message) {
        toast.error(notice.message, {
          id: notice.id,
          duration: notice.retry ? Infinity : undefined,
          action: notice.retry
            ? {
                label: 'Retry',
                onClick: notice.retry,
              }
            : undefined,
        });
      } else {
        toast.dismiss(notice.id);
      }
    }
  }, [
    state.auth.error,
    state.preferencesError,
    state.history.error,
    state.error,
    state.storageWarning,
    state.hasPreferenceSaveError,
  ]);
  return null;
}

function GuestLimitNotice({ state }: { state: ChatState }) {
  if (!state.isGuestLimitReached || state.guestMessageLimit === null) {
    return null;
  }

  return <GuestMessageLimitPrompt limit={state.guestMessageLimit} />;
}

function ChatPageContent() {
  const state = useChatState();
  const actions = useChatActions(state);

  return (
    <ChatLayout
      navigation={{
        config: state.config,
        onNewChat: actions.newChat,
        conversations: state.history.conversations,
        activeConversationId: state.history.id,
        onOpenChat: actions.openChat,
        onDeleteChat: actions.deleteChat,
        onRenameChat: state.history.renameConversation,
        hasMoreChats: state.history.listHasMore,
        onLoadMoreChats: state.history.loadMoreChats,
        onChangeLanguages: actions.changeLanguages,
        reviewCount: state.reviewGroups.length,
        onOpenReview:
          state.config && !state.isSelectingLanguages
            ? () => state.setReviewOpen(true)
            : undefined,
      }}
    >
      <main className="chat-main flex min-h-0 flex-1 overflow-y-auto">
        <div
          className={`content-column${state.isReady ? '' : ' content-column-loading'}`}
        >
          <ChatConversation
            state={state}
            actions={actions}
          />
          <ChatNotices state={state} />
          <div ref={state.messagesEndRef} />
        </div>
      </main>
      <ChatInput
        prompt={state.prompt}
        setPrompt={state.setPrompt}
        loading={state.loading}
        onSend={actions.send}
        onCancel={actions.cancel}
        onVoiceCall={actions.openVoiceCall}
        disabled={isChatInputDisabled(state)}
      />
      <GuestLimitNotice state={state} />
      {state.config && state.voiceOpen && !isChatInputDisabled(state) && (
        <VoiceCall
          open
          config={state.config}
          messages={state.messages}
          loading={state.loading}
          error={state.error}
          onSend={actions.sendSpoken}
          onRetry={actions.retry}
          onClearError={actions.clearError}
          onClose={actions.closeVoiceCall}
        />
      )}
      {state.config && state.reviewOpen && !state.voiceOpen && (
        <ReviewDialog
          cards={state.visibleCards}
          config={state.config}
          onForget={actions.forgetReview}
          onClose={() => state.setReviewOpen(false)}
        />
      )}
    </ChatLayout>
  );
}

export default function ChatPage() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthSessionProvider>
        <ChatPageContent />
      </AuthSessionProvider>
      <Toaster
        richColors
        position="bottom-center"
      />
    </QueryClientProvider>
  );
}
