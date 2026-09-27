import { useRef, useState } from 'react';

interface AudioButtonProps {
  audioUrl?: string;
  label: string;
}

/** Speaker icon; swaps for a small "waiting" glyph while audio plays. */
function SpeakerIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 9v6h4l5 4V5L8 9H4Z"
        fill="currentColor"
        opacity={playing ? 1 : 0.9}
      />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={playing ? 1 : 0.5}
      />
    </svg>
  );
}

export function AudioButton({ audioUrl, label }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioUrl) {
    return (
      <span
        title="Pronunciation audio coming soon"
        aria-disabled="true"
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-night-border px-3 py-1.5 text-xs text-muted"
      >
        <SpeakerIcon playing={false} />
        Audio soon
      </span>
    );
  }

  const handleClick = () => {
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
      className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
    >
      <SpeakerIcon playing={isPlaying} />
      {isPlaying ? 'Playing…' : 'Play'}
    </button>
  );
}
