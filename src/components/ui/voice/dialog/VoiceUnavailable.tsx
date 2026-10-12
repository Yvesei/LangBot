import { MicOff } from 'lucide-react';

interface VoiceUnavailableProps {
  reason: string;
  onClose: () => void;
}

export function VoiceUnavailable({ reason, onClose }: VoiceUnavailableProps) {
  return (
    <div className="voice-unavailable">
      <MicOff className="mx-auto h-12 w-12 text-[var(--muted)]" />
      <h3 className="voice-unavailable-title mt-5 text-2xl font-extrabold">
        Voice calls aren’t available in this browser
      </h3>
      <p className="mt-3 text-base text-[var(--muted)]">{reason}</p>
      <button
        type="button"
        onClick={onClose}
        className="primary-button mt-6"
      >
        Back to chat
      </button>
    </div>
  );
}
