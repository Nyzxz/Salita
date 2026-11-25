import { useEffect, useRef, useState } from 'react';
import { MicIcon } from '../common/icons';

const MAX_SECONDS = 90;
/** Low bitrate keeps a 90-second clip around 350 KB, well under the 1 MB attachment limit. */
const BITS_PER_SECOND = 32000;

interface VoiceRecorderProps {
  /** Called with the finished recording, or null when the student discards it. */
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

const extensionFor = (mime: string): string => (mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm');

export function VoiceRecorder({ onChange, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && pickMimeType() !== undefined;

  const stopTracks = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => () => {
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    stopTracks();
  }, []);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  if (!supported) return <p className="text-xs text-muted">Voice recording isn’t available in this browser. You can still attach an audio file.</p>;

  const start = async () => {
    setError(null);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mic;
      const mimeType = pickMimeType();
      const instance = new MediaRecorder(mic, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: BITS_PER_SECOND });
      const chunks: Blob[] = [];
      instance.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      instance.onstop = () => {
        const type = instance.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type });
        stopTracks();
        setUrl(URL.createObjectURL(blob));
        setState('done');
        onChange(new File([blob], `recording.${extensionFor(type)}`, { type: type.split(';')[0] }));
      };
      recorder.current = instance;
      instance.start();
      setSeconds(0);
      setState('recording');
      timer.current = window.setInterval(() => {
        setSeconds((current) => {
          if (current + 1 >= MAX_SECONDS && instance.state === 'recording') instance.stop();
          return current + 1;
        });
      }, 1000);
    } catch {
      stopTracks();
      setError('Could not use the microphone. Allow microphone access for this site and try again.');
    }
  };

  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();
  const discard = () => {
    setUrl(null);
    setState('idle');
    setSeconds(0);
    onChange(null);
  };
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-night-border bg-white/[0.02] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {state === 'idle' && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => void start()} disabled={disabled}>
            <MicIcon className="h-3.5 w-3.5" /> Record your answer
          </button>
        )}
        {state === 'recording' && (
          <>
            <span className="badge-clay" role="status">● Recording {clock} / 1:30</span>
            <button type="button" className="btn-primary btn-sm" onClick={stop}>Stop</button>
          </>
        )}
        {state === 'done' && url && (
          <>
            <audio controls src={url} className="h-9 max-w-full" />
            <button type="button" className="btn-ghost btn-sm" onClick={discard} disabled={disabled}>Discard &amp; re-record</button>
          </>
        )}
      </div>
      <p className="text-xs text-muted">
        {state === 'done' ? 'Your recording is attached when you press Submit.' : 'Up to 90 seconds. It is sent to your teacher as an audio file.'}
      </p>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
