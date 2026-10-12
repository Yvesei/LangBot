import { Languages, Plus } from 'lucide-react';
import { ReviewToolbar } from '@/components/ui/review/ReviewToolbar';

export interface SidebarActionsProps {
  onNewChat: () => void;
  onChangeLanguages: () => void;
  onOpenReview?: () => void;
  reviewCount: number;
}

export function SidebarActions(props: SidebarActionsProps) {
  return (
    <nav
      aria-label="Chat navigation"
      className="sidebar-navigation"
    >
      <button
        type="button"
        onClick={props.onNewChat}
        className="sidebar-action sidebar-new-chat"
        aria-label="New chat"
      >
        <Plus size={19} />
        <span>New chat</span>
      </button>
      {props.onOpenReview && (
        <ReviewToolbar
          reviewCount={props.reviewCount}
          onOpenReview={props.onOpenReview}
        />
      )}
      <button
        type="button"
        onClick={props.onChangeLanguages}
        className="sidebar-action"
        aria-label="Languages"
      >
        <Languages size={19} />
        <span>Languages</span>
      </button>
    </nav>
  );
}
