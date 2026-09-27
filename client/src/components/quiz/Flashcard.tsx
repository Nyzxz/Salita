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
      className="flex min-h-[16rem] w-full flex-col items-center justify-center gap-4 rounded-xl border border-night-border bg-night-panel p-8 text-center transition-colors hover:border-gold/50"
    >
      {!isFlipped ? (
        <>
          <p className="font-display text-4xl font-semibold text-parchment">{word.word}</p>
          <p className="text-base italic text-gold-soft">{word.phonetic}</p>
          <p className="mt-4 text-xs text-muted">Tap to reveal meaning</p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-gold">{word.translation}</p>
          <p className="max-w-prose text-sm leading-relaxed text-muted">
            {word.historicalContext}
          </p>
          <p className="mt-4 text-xs text-muted">Tap to flip back</p>
        </>
      )}
    </button>
  );
}
