import { Bot, Github, PanelLeftClose } from 'lucide-react';
import type { LanguageConfig, Level } from '@/lib/schemas';
import { SidebarActions, type SidebarActionsProps } from './SidebarActions';
import { SidebarPreferences } from './SidebarPreferences';
import { ThemeSwitcher } from './ThemeSwitcher';

export interface ChatNavigationProps extends SidebarActionsProps {
  config: LanguageConfig | null;
  level: Level;
  onLevelChange: (level: Level) => void;
}

interface ChatSidebarProps extends ChatNavigationProps {
  isOpen: boolean;
  panelRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function ChatSidebar(props: ChatSidebarProps) {
  const onOpenReview = props.onOpenReview;

  function navigate(action: () => void) {
    props.onClose();
    action();
  }

  return (
    <aside
      id="chat-sidebar"
      ref={props.panelRef}
      className="chat-sidebar"
      data-open={props.isOpen}
      role={props.isOpen ? 'dialog' : undefined}
      aria-modal={props.isOpen || undefined}
      aria-label="App navigation"
    >
      <div className="sidebar-brand">
        <span
          className="brand-mark"
          aria-hidden="true"
        >
          <Bot
            size={27}
            strokeWidth={2.3}
          />
        </span>
        <h1 className="brand-title">LangBot</h1>
        <button
          type="button"
          className="icon-button sidebar-close"
          onClick={props.onClose}
          aria-label="Close navigation"
        >
          <PanelLeftClose size={21} />
        </button>
      </div>
      <SidebarActions
        onNewChat={() => navigate(props.onNewChat)}
        onChangeLanguages={() => navigate(props.onChangeLanguages)}
        reviewCount={props.reviewCount}
        onOpenReview={onOpenReview ? () => navigate(onOpenReview) : undefined}
      />
      <SidebarPreferences
        config={props.config}
        level={props.level}
        onLevelChange={props.onLevelChange}
      />
      <div className="sidebar-footer">
        <ThemeSwitcher />
        <a
          href="https://github.com/Yvesei/LangBot"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-action"
          aria-label="GitHub repository"
        >
          <Github size={20} />
          <span>GitHub</span>
        </a>
      </div>
    </aside>
  );
}
