import { Github, Languages, Plus } from 'lucide-react';
import { ReviewToolbar } from '@/components/ui/review/ReviewToolbar';

interface ChatHeaderActionsProps {
  onChangeLanguages: () => void;
  onNewChat: () => void;
  reviewCount: number;
  onOpenReview?: () => void;
}

export function ChatHeaderActions(props: ChatHeaderActionsProps) {
  return (
    <nav
      aria-label="Chat navigation"
      className="ml-auto flex items-center gap-1 sm:gap-2"
    >
      {props.onOpenReview && (
        <ReviewToolbar
          reviewCount={props.reviewCount}
          onOpenReview={props.onOpenReview}
        />
      )}
      <button
        onClick={props.onNewChat}
        className="icon-button"
        aria-label="New chat"
        title="New chat"
      >
        <Plus size={19} />
      </button>
      <button
        onClick={props.onChangeLanguages}
        className="icon-button"
        aria-label="Languages"
        title="Change languages"
      >
        <Languages size={19} />
      </button>
      <a
        href="https://github.com/Yvesei/LangBot"
        target="_blank"
        rel="noopener noreferrer"
        className="icon-button hidden sm:inline-flex"
        aria-label="GitHub repository"
        title="GitHub"
      >
        <Github size={18} />
      </a>
    </nav>
  );
}
