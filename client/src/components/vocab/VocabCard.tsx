import type { WordItem } from '@shared/types';
import { AudioButton } from './AudioButton';

interface VocabCardProps {
  word: WordItem;
  isFavorite?: boolean;
  onToggleFavorite?: (wordId: string) => void;
}

export function VocabCard({ word, isFavorite = false, onToggleFavorite }: VocabCardProps) {
  return (
    <article className="surface-interactive group flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-parchment">{word.word}</h3>
          <p className="mt-1 text-sm italic text-gold-soft">{word.phonetic}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(word.id)}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Remove ${word.word} from favourites` : `Add ${word.word} to favourites`}
              className={`text-xl leading-none transition ${isFavorite ? 'text-clay' : 'text-muted hover:text-clay'}`}
            >
              {isFavorite ? '♥' : '♡'}
            </button>
          )}
          <AudioButton audioUrl={word.audioUrl} label={word.word} />
        </div>
      </div>

      <p className="text-base font-medium text-parchment">{word.translation}</p>

      <p className="text-sm leading-relaxed text-muted">{word.historicalContext}</p>

      {word.etymologyOrigin && (
        <p className="mt-auto border-t border-night-border pt-4">
          <span className="badge-gold">Origin · {word.etymologyOrigin}</span>
        </p>
      )}
    </article>
  );
}
