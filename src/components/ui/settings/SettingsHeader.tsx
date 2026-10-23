import type { RefObject } from 'react';
import { X } from 'lucide-react';

interface SettingsHeaderProps {
  closeButton: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function SettingsHeader(props: SettingsHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <h2
        id="settings-title"
        className="text-xl font-bold tracking-tight"
      >
        Settings
      </h2>
      <button
        ref={props.closeButton}
        type="button"
        onClick={props.onClose}
        className="icon-button"
        aria-label="Close settings"
      >
        <X size={18} />
      </button>
    </header>
  );
}
