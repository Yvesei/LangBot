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
    <header className="flex items-center justify-between gap-4">
      <div>
        <h2
          id="voice-call-title"
          className="text-lg font-semibold"
        >
          Voice call with LangBot
        </h2>
        <p className="text-sm text-slate-400">
          {LANGUAGES[config.nativeLanguage]} + {LANGUAGES[config.targetLanguage]} · Mix
          both as you speak
        </p>
      </div>
      <button
        ref={closeButton}
        type="button"
        onClick={onClose}
        className="rounded-full border border-white/20 p-3 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label="End voice call"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}
