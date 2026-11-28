/** Tiny sound effects made with the browser's audio engine (no files). Can be muted. */
const MUTE_KEY = 'salita.sfx.muted';

export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

let context: AudioContext | null = null;

function tone(frequency: number, start: number, length: number, volume = 0.06): void {
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + length + 0.05);
}

export type Sound = 'select' | 'good' | 'combo' | 'finish';

export function play(sound: Sound): void {
  if (isMuted() || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context = context ?? new Ctor();
    if (context.state === 'suspended') void context.resume();
    if (sound === 'select') tone(520, 0, 0.08);
    else if (sound === 'good') {
      tone(660, 0, 0.1);
      tone(880, 0.09, 0.14);
    } else if (sound === 'combo') {
      tone(660, 0, 0.08);
      tone(880, 0.07, 0.08);
      tone(1100, 0.14, 0.16);
    } else {
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, index * 0.12, 0.25, 0.07));
    }
  } catch {
    /* audio not available */
  }
}
