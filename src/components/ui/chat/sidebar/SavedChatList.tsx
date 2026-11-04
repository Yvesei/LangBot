import { Trash2 } from 'lucide-react';
import type { SavedConversation } from '@/lib/chat/saved';

interface SavedChatListProps {
  conversations: SavedConversation[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  hasMore: boolean;
  onLoadMore?: () => void;
}

export function SavedChatList(props: SavedChatListProps) {
  if (props.conversations.length === 0) {
    return null;
  }
  return (
    <nav
      className="saved-chat-list"
      aria-label="Saved chats"
    >
      <p className="saved-chat-heading">Saved chats</p>
      {props.conversations.map((chat) => (
        <div
          className="saved-chat-row"
          key={chat.id}
        >
          <button
            type="button"
            className="saved-chat-open"
            aria-current={chat.id === props.activeId ? 'page' : undefined}
            onClick={() => props.onOpen(chat.id)}
            title={chat.title}
          >
            {chat.title}
          </button>
          {props.onDelete && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Delete chat: ${chat.title}`}
              onClick={() => props.onDelete?.(chat.id)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {props.hasMore && props.onLoadMore && (
        <button
          type="button"
          className="sidebar-action"
          onClick={props.onLoadMore}
        >
          Load more chats
        </button>
      )}
    </nav>
  );
}
