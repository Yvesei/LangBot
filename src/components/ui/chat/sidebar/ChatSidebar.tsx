import { Github, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '@/components/ui/brand/Logo';
import { AuthMenu } from '../header/AuthMenu';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SavedChatList } from './SavedChatList';
import { SidebarActions, type SidebarActionsProps } from './SidebarActions';

export type ChatNavigationProps = SidebarActionsProps;

interface ChatSidebarProps extends ChatNavigationProps {
  isOpen: boolean;
  panelRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  width: number;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeWithKeyboard: (event: React.KeyboardEvent<HTMLDivElement>) => void;
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
      data-collapsed={props.isCollapsed}
      style={{ '--sidebar-width': `${props.width}px` } as React.CSSProperties}
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
        <h1 className="brand-title">Languify</h1>
        <button
          type="button"
          className="icon-button sidebar-collapse"
          onClick={props.onToggleCollapsed}
          aria-label={props.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={props.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {props.isCollapsed ? <PanelLeftOpen size={21} /> : <PanelLeftClose size={21} />}
        </button>
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
      <SavedChatList
        conversations={props.conversations ?? []}
        activeId={props.activeConversationId ?? null}
        onOpen={(id) => props.onOpenChat && navigate(() => props.onOpenChat!(id))}
        onDelete={props.onDeleteChat}
        onRename={props.onRenameChat}
        hasMore={props.hasMoreChats ?? false}
        onLoadMore={props.onLoadMoreChats}
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
        <AuthMenu />
      </div>
      <div
        className="sidebar-resize-handle"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={56}
        aria-valuemax={420}
        aria-valuenow={props.width}
        tabIndex={0}
        onPointerDown={props.onResizeStart}
        onKeyDown={props.onResizeWithKeyboard}
      />
    </aside>
  );
}
