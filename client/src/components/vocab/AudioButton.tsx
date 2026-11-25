import { useRef, useState } from 'react';
import { SpeakerIcon } from '../common/icons';
import { canSpeak, speakFilipino } from '../../lib/speech';

interface AudioButtonProps {
  audioUrl?: string;
  label: string;
}

export function AudioButton({ audioUrl, label }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // No recording: say the word with the browser's voice instead. If that isn't possible, show nothing.
  if (!audioUrl && !canSpeak()) return null;

  const handleClick = () => {
    if (!audioUrl) {
      setIsPlaying(true);
      speakFilipino(label, () => setIsPlaying(false));
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    void audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Play pronunciation of ${label}`}
      className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        isPlaying ? 'border-gold bg-gold text-night' : 'border-gold/40 text-gold hover:bg-gold/10'
      }`}
    >
      <SpeakerIcon className="h-3.5 w-3.5" />
      {isPlaying ? 'Playing…' : 'Play'}
    </button>
  );
}
