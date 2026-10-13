import { Bot, User } from 'lucide-react';

export function MessageAuthor({ user }: { user: boolean }) {
  return (
    <p className="message-author">
      {user ? <User size={18} /> : <Bot size={20} />} {user ? 'You' : 'Languify'}
    </p>
  );
}
