import { Github, PanelLeftClose } from 'lucide-react';
import { Logo } from '@/components/ui/brand/Logo';
import { SidebarActions, type SidebarActionsProps } from './SidebarActions';
import { ThemeSwitcher } from './ThemeSwitcher';

export type ChatNavigationProps = SidebarActionsProps;

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
          <Logo />
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
        config={props.config}
        onNewChat={() => navigate(props.onNewChat)}
        onChangeLanguages={() => navigate(props.onChangeLanguages)}
        reviewCount={props.reviewCount}
        onOpenReview={onOpenReview ? () => navigate(onOpenReview) : undefined}
      />
      <div className="sidebar-footer">
        <ThemeSwitcher />
        <a
          href="https://github.com/Yvesei/LangBot"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          aria-label="GitHub repository"
          title="GitHub repository"
        >
          <Github size={20} />
        </a>
      </div>
    </aside>
  );
}
