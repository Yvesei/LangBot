import { Bot, Github, Plus, Languages } from 'lucide-react';
import { LANGUAGES, type LanguageConfig, type Level } from '@/lib/schemas';

interface ChatHeaderProps {
  config: LanguageConfig | null;
  level: Level;
  onLevelChange: (level: Level) => void;
  onChangeLanguages: () => void;
  onNewChat: () => void;
}

export function ChatHeader({
  config,
  level,
  onLevelChange,
  onChangeLanguages,
  onNewChat,
}: ChatHeaderProps) {
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
            / {config ? LANGUAGES[config.targetLanguage] : 'Language companion'}
          </span>
        </h1>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <label className="mr-1 text-xs">
          <span className="sr-only">Level</span>
          <select
            value={level}
            onChange={(e) => onLevelChange(e.target.value as Level)}
            className="level-select"
            title="Practice level"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <button
          onClick={onNewChat}
          className="icon-button"
          aria-label="New chat"
          title="New chat"
        >
          <Plus size={19} />
        </button>
        <button
          onClick={onChangeLanguages}
          className="icon-button"
          aria-label="Languages"
          title="Change languages"
        >
          <Languages size={19} />
        </button>
        <a
          href="https://github.com/Yvesei/LangBot"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button hidden sm:inline-flex"
          aria-label="GitHub repository"
          title="GitHub"
        >
          <Github size={18} />
        </a>
      </div>
    </header>
  );
}
