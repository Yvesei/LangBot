import { MicOff } from 'lucide-react';

interface VoiceUnavailableProps {
  reason: string;
  onClose: () => void;
}

export function VoiceUnavailable({ reason, onClose }: VoiceUnavailableProps) {
  return (
    <div className="m-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <MicOff className="mx-auto h-10 w-10 text-slate-400" />
      <h3 className="mt-4 text-xl font-semibold">
        Voice calls aren’t available in this browser
      </h3>
      <p className="mt-2 text-sm text-slate-300">{reason}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 rounded-full bg-white px-5 py-2.5 font-medium text-slate-950"
      >
        Back to chat
      </button>
    </div>
  );
}
