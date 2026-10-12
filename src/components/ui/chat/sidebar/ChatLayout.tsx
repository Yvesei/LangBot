import { PanelLeftOpen } from 'lucide-react';
import { ChatSidebar, type ChatNavigationProps } from './ChatSidebar';
import { useSidebar } from './useSidebar';

interface ChatLayoutProps {
  navigation: ChatNavigationProps;
  children: React.ReactNode;
}

export function ChatLayout({ navigation, children }: ChatLayoutProps) {
  const sidebar = useSidebar();

  return (
    <div className="app-shell">
      <ChatSidebar
        {...navigation}
        isOpen={sidebar.isOpen}
        panelRef={sidebar.panelRef}
        onClose={sidebar.close}
      />
      {sidebar.isOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          tabIndex={-1}
          aria-hidden="true"
          onClick={sidebar.close}
        />
      )}
      <div
        className="chat-workspace"
        inert={sidebar.isOpen}
      >
        <button
          ref={sidebar.toggleRef}
          type="button"
          className="icon-button sidebar-toggle"
          onClick={sidebar.show}
          aria-label="Open navigation"
          aria-controls="chat-sidebar"
          aria-expanded={sidebar.isOpen}
        >
          <PanelLeftOpen size={21} />
        </button>
        {children}
      </div>
    </div>
  );
}
