import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { SavedConversation } from '@/lib/chat/saved';

interface SavedChatListProps {
  conversations: SavedConversation[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, title: string) => Promise<void>;
  hasMore: boolean;
  onLoadMore?: () => void;
}

function RenameChat({
  chat,
  onRename,
  onClose,
}: {
  chat: SavedConversation;
  onRename: (id: string, title: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(chat.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onRename(chat.id, trimmed);
      onClose();
    } catch {
      setError('Could not rename this chat. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="saved-chat-edit"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="saved-chat-row">
        <input
          ref={inputRef}
          aria-label="Conversation title"
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !saving) {
              onClose();
            }
          }}
        />
        <button
          type="submit"
          className="icon-button"
          aria-label="Save title"
          disabled={saving || !title.trim()}
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Cancel rename"
          disabled={saving}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function SavedChatRow({
  chat,
  props,
}: {
  chat: SavedConversation;
  props: SavedChatListProps;
}) {
  const [editing, setEditing] = useState(false);
  if (editing && props.onRename) {
    return (
      <RenameChat
        chat={chat}
        onRename={props.onRename}
        onClose={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="saved-chat-row">
      <button
        type="button"
        className="saved-chat-open"
        aria-current={chat.id === props.activeId ? 'page' : undefined}
        onClick={() => props.onOpen(chat.id)}
        title={chat.title}
      >
        {chat.title}
      </button>
      {props.onRename && (
        <button
          type="button"
          className="icon-button"
          aria-label={`Rename chat: ${chat.title}`}
          onClick={() => setEditing(true)}
        >
          <Pencil size={16} />
        </button>
      )}
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
  );
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
        <SavedChatRow
          key={chat.id}
          chat={chat}
          props={props}
        />
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
