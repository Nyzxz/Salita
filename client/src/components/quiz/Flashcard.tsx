import { useState } from 'react';
import type { WordItem } from '@shared/types';

interface FlashcardProps {
  word: WordItem;
}

export function Flashcard({ word }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setIsFlipped((prev) => !prev)}
      aria-label={isFlipped ? 'Show the Filipino word' : 'Reveal the translation and context'}
      className="surface-interactive relative flex min-h-[18rem] w-full max-w-2xl flex-col items-center justify-center gap-4 overflow-hidden p-8 text-center"
    >
      <span aria-hidden="true" className="grid-dots pointer-events-none absolute inset-0 opacity-60" />
      <span className="badge-neutral relative">{isFlipped ? 'Meaning' : 'Word'}</span>
      {!isFlipped ? (
        <div key="front" className="relative animate-scale-in">
          <p className="font-display text-5xl font-semibold text-parchment">{word.word}</p>
          <p className="mt-3 text-base italic text-gold-soft">{word.phonetic}</p>
          <p className="mt-8 text-xs text-muted">Tap to reveal meaning</p>
        </div>
      ) : (
        <div key="back" className="relative animate-scale-in">
          <p className="text-2xl font-semibold text-gold">{word.translation}</p>
          <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-muted">{word.historicalContext}</p>
          <p className="mt-6 text-xs text-muted">Tap to flip back</p>
        </div>
      )}
    </button>
  );
}
