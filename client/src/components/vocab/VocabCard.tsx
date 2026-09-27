import type { WordItem } from '@shared/types';
import { AudioButton } from './AudioButton';

interface VocabCardProps {
  word: WordItem;
}

export function VocabCard({ word }: VocabCardProps) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-night-border bg-night-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-semibold text-parchment">{word.word}</h3>
          <p className="mt-0.5 text-sm italic text-gold-soft">{word.phonetic}</p>
        </div>
        <AudioButton audioUrl={word.audioUrl} label={word.word} />
      </div>

      <p className="text-base text-parchment">{word.translation}</p>

      <p className="text-sm leading-relaxed text-muted">{word.historicalContext}</p>

      {word.etymologyOrigin && (
        <p className="mt-auto pt-2">
          <span className="inline-block rounded-full border border-night-border px-3 py-1 text-xs text-muted">
            Origin: {word.etymologyOrigin}
          </span>
        </p>
      )}
    </article>
  );
}
