'use client';

import { ChatLayout } from '@/components/ui/chat/sidebar/ChatLayout';
import { ChatInput } from '@/components/ui/chat/input/ChatInput';
import { ReviewDialog } from '@/components/ui/review/dialog/ReviewDialog';
import { VoiceCall } from '@/components/ui/voice/VoiceCall';
import { ChatConversation } from './ChatConversation';
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
          className="notice-error mt-4"
        >
          {error}
        </p>
      )}
      {storageWarning && (
        <p
          role="status"
          className="mt-4 text-base font-medium text-[var(--muted)]"
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
    <ChatLayout
      navigation={{
        config: state.config,
        onNewChat: actions.newChat,
        onChangeLanguages: actions.changeLanguages,
        reviewCount: state.reviewGroups.length,
        onOpenReview:
          state.config && !state.isSelectingLanguages
            ? () => state.setReviewOpen(true)
            : undefined,
      }}
    >
      <main className="chat-main flex min-h-0 flex-1 overflow-y-auto">
        <div className="content-column">
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
        onVoiceCall={actions.openVoiceCall}
        disabled={!state.isReady || !state.config || state.isSelectingLanguages}
      />
      {state.config && state.voiceOpen && (
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
