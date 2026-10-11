import { Bot, User } from 'lucide-react';

export function MessageAuthor({ user }: { user: boolean }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
      {user ? <User size={15} /> : <Bot size={17} />} {user ? 'You' : 'LangBot'}
    </p>
  );
}
