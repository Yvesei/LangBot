import { ReviewDialog } from '@/components/ui/panels/ReviewDialog';
import { VoiceCall } from '@/components/ui/voice/VoiceCall';
import type { ChatActions } from './useChatActions';
import type { ChatState } from './useChatState';

interface ChatOverlaysProps {
  state: ChatState;
  actions: ChatActions;
}

export function ChatOverlays({ state, actions }: ChatOverlaysProps) {
  if (!state.config) {
    return null;
  }

  return (
    <>
      {state.voiceOpen && (
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
      {state.reviewOpen && !state.voiceOpen && (
        <ReviewDialog
          cards={state.visibleCards}
          config={state.config}
          onGrade={actions.gradeReview}
          onForget={actions.forgetReview}
          onClose={() => state.setReviewOpen(false)}
        />
      )}
    </>
  );
}
