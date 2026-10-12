import { Bot } from 'lucide-react';
import { LANGUAGES, type LanguageConfig, type Level } from '@/lib/schemas';
import { ChatHeaderActions } from './ChatHeaderActions';
import { ThemeSwitcher } from './ThemeSwitcher';

interface ChatHeaderProps {
  config: LanguageConfig | null;
  level: Level;
  onLevelChange: (level: Level) => void;
  onChangeLanguages: () => void;
  onNewChat: () => void;
  reviewCount: number;
  onOpenReview?: () => void;
}

export function ChatHeader(props: ChatHeaderProps) {
  const languageName = props.config
    ? LANGUAGES[props.config.targetLanguage]
    : 'Language companion';

  return (
    <header className="chat-header flex-wrap">
      <div className="chat-brand flex items-center gap-3">
        <span className="brand-mark">
          <Bot
            size={27}
            strokeWidth={2.3}
          />
        </span>
        <h1 className="brand-title">
          LangBot
          <span
            data-theme-content="original"
            className="ml-2 hidden text-sm font-normal text-[var(--muted)] sm:inline"
          >
            / {languageName}
          </span>
        </h1>
        {props.config && (
          <span
            data-theme-content="neo"
            className="language-chip"
            title={languageName}
          >
            {languageName}
          </span>
        )}
      </div>
      <div className="header-controls">
        <ChatHeaderActions
          level={props.level}
          onLevelChange={props.onLevelChange}
          onChangeLanguages={props.onChangeLanguages}
          onNewChat={props.onNewChat}
          reviewCount={props.reviewCount}
          onOpenReview={props.onOpenReview}
        />
        <ThemeSwitcher />
      </div>
    </header>
  );
}
