import { Github, Languages, Plus } from 'lucide-react';
import type { Level } from '@/lib/schemas';

interface ChatHeaderActionsProps {
  level: Level;
  onLevelChange: (level: Level) => void;
  onChangeLanguages: () => void;
  onNewChat: () => void;
}

export function ChatHeaderActions(props: ChatHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <label className="mr-1 text-xs">
        <span className="sr-only">Level</span>
        <select
          value={props.level}
          onChange={(event) => props.onLevelChange(event.target.value as Level)}
          className="level-select"
          title="Practice level"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
      <button
        onClick={props.onNewChat}
        className="icon-button"
        aria-label="New chat"
        title="New chat"
      >
        <Plus size={19} />
      </button>
      <button
        onClick={props.onChangeLanguages}
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
  );
}
