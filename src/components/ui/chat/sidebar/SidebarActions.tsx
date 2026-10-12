import { Languages, Plus } from 'lucide-react';
import { ReviewToolbar } from '@/components/ui/review/ReviewToolbar';
import { LANGUAGES, type LanguageConfig } from '@/lib/schemas';

export interface SidebarActionsProps {
  config: LanguageConfig | null;

  onNewChat: () => void;
  onChangeLanguages: () => void;
  onOpenReview?: () => void;
  reviewCount: number;
}

export function SidebarActions(props: SidebarActionsProps) {
  const language = props.config ? LANGUAGES[props.config.targetLanguage] : 'Languages';

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
        aria-label={`Change languages: ${language}`}
        title="Change languages"
      >
        <Languages size={19} />
        <span>{language}</span>
      </button>
    </nav>
  );
}
