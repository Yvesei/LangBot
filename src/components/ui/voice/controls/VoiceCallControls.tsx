import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceCallControlsProps {
  micEnabled: boolean;
  speakerEnabled: boolean;
  speakerAvailable: boolean;
  onToggleMicrophone: () => void;
  onToggleSpeaker: () => void;
  onClose: () => void;
}

export function VoiceCallControls(props: VoiceCallControlsProps) {
  return (
    <div className="mt-8 flex items-center gap-4">
      <button
        type="button"
        onClick={props.onToggleMicrophone}
        className="rounded-full border border-white/15 bg-white/10 p-4 hover:bg-white/15"
        aria-label={props.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {props.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={props.onClose}
        className="rounded-full bg-rose-600 p-5 hover:bg-rose-500"
        aria-label="End voice call"
      >
        <PhoneOff className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={props.onToggleSpeaker}
        disabled={!props.speakerAvailable}
        className="rounded-full border border-white/15 bg-white/10 p-4 hover:bg-white/15"
        aria-label={props.speakerEnabled ? 'Mute spoken replies' : 'Play spoken replies'}
      >
        {props.speakerEnabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
