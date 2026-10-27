'use client';

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
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="notice-error mt-4"
        >
          {state.error}
        </p>
      )}
      {state.storageWarning && (
        <p
          role="status"
          className="mt-4 text-base font-medium text-[var(--muted)]"
        >
          {state.storageWarning}
        </p>
      )}
      {state.hasPreferenceSaveError && (
        <button
          type="button"
          onClick={state.retrySavePreferences}
        >
          Retry saving preferences
        </button>
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
      {state.isGuestLimitReached && (
        <GuestMessageLimitPrompt limit={state.guestMessageLimit} />
      )}
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
