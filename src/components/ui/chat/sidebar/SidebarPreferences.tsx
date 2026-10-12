import { ArrowRight } from 'lucide-react';
import { LANGUAGES, type LanguageConfig, type Level } from '@/lib/schemas';

interface SidebarPreferencesProps {
  config: LanguageConfig | null;
  level: Level;
  onLevelChange: (level: Level) => void;
}

export function SidebarPreferences(props: SidebarPreferencesProps) {
  return (
    <section
      className="sidebar-preferences"
      aria-label="Practice settings"
    >
      <h2 className="sidebar-section-label">Your practice</h2>
      {props.config && (
        <p className="sidebar-language-pair">
          <span>{LANGUAGES[props.config.nativeLanguage]}</span>
          <ArrowRight
            size={14}
            aria-hidden="true"
          />
          <span>{LANGUAGES[props.config.targetLanguage]}</span>
        </p>
      )}
      <label className="sidebar-level">
        <span>Level</span>
        <select
          value={props.level}
          onChange={(event) => props.onLevelChange(event.target.value as Level)}
          className="level-select"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>
    </section>
  );
}
