import { useMemo, useState } from 'react';
import type { LectureRecord } from '@shared/types';
import { canSpeak, speakFilipino } from '../../lib/speech';
import { play } from '../../lib/sfx';
import { RichText } from '../../lib/richText';
import { Confetti } from '../common/Confetti';

export type JourneyStep =
  | { kind: 'meet' }
  | { kind: 'flip' }
  | { kind: 'story'; text: string; index: number; total: number }
  | { kind: 'origin' }
  | { kind: 'checkpoint' };

/** Splits the teacher's background text into small cards of up to two sentences. */
export function storyChunks(text: string): string[] {
  const chunks: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    const sentences = paragraph.trim().match(/[^.!?]+[.!?]*\s*/g) ?? [];
    for (let i = 0; i < sentences.length; i += 2) {
      const piece = sentences.slice(i, i + 2).join('').trim();
      if (piece) chunks.push(piece);
    }
  }
  return chunks.length > 0 ? chunks : [text.trim()];
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface LectureJourneyProps {
  lecture: LectureRecord;
  /** Other lectures supply wrong answers for the checkpoint. */
  others: LectureRecord[];
  onXp: (amount: number, reason: string) => void;
  onComplete: () => void;
  onClose: () => void;
}

/** A lecture as a short journey: meet the word, flip to reveal, story cards, then a checkpoint. */
export function LectureJourney({ lecture, others, onXp, onComplete, onClose }: LectureJourneyProps) {
  const steps = useMemo<JourneyStep[]>(() => {
    const story = storyChunks(lecture.historicalContext);
    return [
      { kind: 'meet' },
      { kind: 'flip' },
      ...story.map((text, index) => ({ kind: 'story' as const, text, index, total: story.length })),
      ...(lecture.etymologyOrigin ? [{ kind: 'origin' as const }] : []),
      { kind: 'checkpoint' },
    ];
  }, [lecture]);

  const options = useMemo(() => {
    const wrong = shuffled(others.filter((other) => other.translation.toLowerCase() !== lecture.translation.toLowerCase())).slice(0, 3).map((other) => other.translation);
    return shuffled([lecture.translation, ...wrong]);
  }, [lecture, others]);
  const hasChoices = options.length >= 3;

  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, setVisited] = useState<Set<number>>(new Set([0]));
  const current = steps[step];

  const goTo = (next: number) => {
    setStep(next);
    setVisited((previous) => {
      if (previous.has(next)) return previous;
      onXp(5, 'card');
      play('select');
      return new Set(previous).add(next);
    });
  };

  const finish = (bonus: number) => {
    setDone(true);
    onXp(20 + bonus, 'lecture complete');
    onComplete();
    play('finish');
  };

  const choose = (option: string) => {
    if (picked) return;
    setPicked(option);
    if (option === lecture.translation) {
      onXp(25, 'checkpoint');
      play('good');
    }
  };

  if (done) {
    return (
      <div className="surface relative animate-scale-in overflow-hidden p-8 text-center">
        <Confetti />
        <p className="eyebrow">Lecture complete</p>
        <h3 className="mt-2 text-2xl font-semibold text-parchment">You learned “{lecture.word}”!</h3>
        <p className="mt-2 text-sm text-muted">It is marked as read. Keep going — the next word is waiting.</p>
        <button type="button" className="btn-primary mt-6" onClick={onClose}>Back to lectures</button>
      </div>
    );
  }

  return (
    <div className="surface animate-fade-in p-5 sm:p-8" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-ghost btn-sm -ml-2" onClick={onClose}>← All lectures</button>
        <span className="text-xs text-muted">Card {step + 1} of {steps.length}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step + 1}>
        <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="mt-6 flex min-h-[16rem] flex-col items-center justify-center text-center">
        {current.kind === 'meet' && (
          <>
            <p className="eyebrow">Meet the word</p>
            <h3 className="mt-3 font-display text-5xl font-semibold text-parchment">{lecture.word}</h3>
            <p className="mt-2 text-sm italic text-muted">/{lecture.phonetic}/</p>
            {canSpeak() && (
              <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => speakFilipino(lecture.word)}>🔊 Hear it</button>
            )}
            <p className="mt-5 text-xs text-muted">Say it out loud, then continue.</p>
          </>
        )}
        {current.kind === 'flip' && (
          <>
            <p className="eyebrow">Flip card</p>
            <button
              type="button"
              onClick={() => { setFlipped((value) => !value); play('select'); }}
              className="mt-4 flex h-44 w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 px-6 transition hover:bg-gold/15"
              aria-label={flipped ? 'Flip back to the word' : 'Flip to reveal the meaning'}
            >
              {flipped ? (
                <>
                  <span className="text-xs uppercase tracking-wide text-muted">Meaning</span>
                  <span className="mt-2 text-2xl font-semibold text-gold">{lecture.translation}</span>
                </>
              ) : (
                <>
                  <span className="font-display text-3xl font-semibold text-parchment">{lecture.word}</span>
                  <span className="mt-3 text-xs text-muted">Tap to guess, then reveal the meaning</span>
                </>
              )}
            </button>
          </>
        )}
        {current.kind === 'story' && (
          <>
            <p className="eyebrow">Story · {current.index + 1}/{current.total}</p>
            <div className="mt-4 max-w-xl text-left sm:text-center"><RichText text={current.text} className="text-base text-parchment/90" /></div>
          </>
        )}
        {current.kind === 'origin' && (
          <>
            <p className="eyebrow">Where it comes from</p>
            <span className="badge-gold mt-4 text-base">{lecture.etymologyOrigin}</span>
          </>
        )}
        {current.kind === 'checkpoint' && (
          <div className="w-full max-w-md">
            <p className="eyebrow">Checkpoint · +25 XP</p>
            {hasChoices ? (
              <>
                <h3 className="mt-3 text-xl font-semibold text-parchment">What does “{lecture.word}” mean?</h3>
                <ul className="mt-5 flex flex-col gap-2 text-left">
                  {options.map((option) => {
                    const isRight = option === lecture.translation;
                    const state = !picked ? 'idle' : isRight ? 'right' : option === picked ? 'wrong' : 'idle';
                    return (
                      <li key={option}>
                        <button
                          type="button"
                          disabled={picked !== null}
                          onClick={() => choose(option)}
                          className={`w-full rounded-xl border px-4 py-3 text-sm transition ${state === 'right' ? 'border-leaf bg-leaf/15 text-leaf' : state === 'wrong' ? 'border-clay bg-clay/15 text-clay' : 'border-night-border text-muted hover:border-gold/40 hover:text-parchment'}`}
                        >
                          {option}{state === 'right' ? ' ✓' : state === 'wrong' ? ' ✗' : ''}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {picked && <p className="mt-4 text-sm text-muted">{picked === lecture.translation ? 'Correct! +25 XP' : `Not quite — it means “${lecture.translation}”.`}</p>}
              </>
            ) : (
              <>
                <h3 className="mt-3 text-xl font-semibold text-parchment">Say it from memory</h3>
                <p className="mt-2 text-sm text-muted">Without scrolling up: what does “{lecture.word}” mean? Then check your answer.</p>
                <button type="button" className="btn-secondary mt-4" onClick={() => setPicked(lecture.translation)}>
                  {picked ? lecture.translation : 'Show the answer'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => goTo(step - 1)}>Back</button>
        {current.kind !== 'checkpoint' ? (
          <button type="button" className="btn-primary" onClick={() => goTo(step + 1)}>Next</button>
        ) : (
          <button type="button" className="btn-primary" disabled={picked === null} onClick={() => finish(0)}>Finish lecture (+20 XP)</button>
        )}
      </div>
    </div>
  );
}
