/** Spoken pronunciation using the browser's own voices (free, no files to host). */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Speaks a Filipino word. Prefers a Filipino/Tagalog voice, falls back to the default voice. */
export function speakFilipino(text: string, onDone?: () => void): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((candidate) => /^(fil|tl)([-_]|$)/i.test(candidate.lang));
  utterance.lang = voice?.lang ?? 'fil-PH';
  if (voice) utterance.voice = voice;
  utterance.rate = 0.85;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}
