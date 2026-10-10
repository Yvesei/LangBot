import { Bot } from 'lucide-react';
import { LANGUAGES, type LanguageConfig, type Level } from '@/lib/schemas';
import { ChatHeaderActions } from './ChatHeaderActions';

interface ChatHeaderProps {
  config: LanguageConfig | null;
  level: Level;
  onLevelChange: (level: Level) => void;
  onChangeLanguages: () => void;
  onNewChat: () => void;
}

export function ChatHeader(props: ChatHeaderProps) {
  const languageName = props.config
    ? LANGUAGES[props.config.targetLanguage]
    : 'Language companion';

  return (
    <header className="chat-header">
      <div className="flex items-center gap-3">
        <span className="brand-mark">
          <Bot
            size={20}
            strokeWidth={1.7}
          />
        </span>
        <h1 className="text-base font-semibold tracking-tight">
          LangBot
          <span className="ml-2 hidden text-xs font-normal text-[var(--muted)] sm:inline">
            / {languageName}
          </span>
        </h1>
      </div>
      <ChatHeaderActions
        level={props.level}
        onLevelChange={props.onLevelChange}
        onChangeLanguages={props.onChangeLanguages}
        onNewChat={props.onNewChat}
      />
    </header>
  );
}
