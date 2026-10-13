import { X } from 'lucide-react';
import { LANGUAGES } from '@/lib/schemas';
import type { LanguageConfig } from '@/lib/schemas';

interface VoiceCallHeaderProps {
  config: LanguageConfig;
  closeButton: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function VoiceCallHeader({ config, closeButton, onClose }: VoiceCallHeaderProps) {
  return (
    <header className="voice-header">
      <div>
        <h2
          id="voice-call-title"
          className="voice-title text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Voice call with Languify
        </h2>
        <p className="mt-2 text-base text-[var(--muted)]">
          {LANGUAGES[config.nativeLanguage]} + {LANGUAGES[config.targetLanguage]} · Mix
          both as you speak
        </p>
      </div>
      <button
        ref={closeButton}
        type="button"
        onClick={onClose}
        className="icon-button"
        aria-label="End voice call"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}
