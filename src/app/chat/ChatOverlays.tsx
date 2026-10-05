import { ReviewDialog } from '@/components/ui/panels/ReviewDialog';
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
      {state.reviewOpen && (
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
