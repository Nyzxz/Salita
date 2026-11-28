import { useEffect, useRef, useState } from 'react';
import type { QuizContent } from '@shared/types';
import { isMuted, play, setMuted } from '../../lib/sfx';

export interface QuestionLayout {
  questionIndex: number;
  optionOrder: number[];
}

interface QuizGameTakeProps {
  quiz: QuizContent;
  layout: QuestionLayout[];
  answers: number[];
  flagged: number[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
  onToggleFlag: (questionIndex: number) => void;
  /** Called when the student reaches the end and taps "Finish". */
  onFinish: () => void;
  /** Quest XP earned while playing (a fun counter; the real score is worked out by the server). */
  onXp: (amount: number) => void;
  xp: number;
}

const DEFAULT_FAST_SECONDS = 15;

/** One question at a time with a progress bar, speed bonus, combo multiplier and sound. */
export function QuizGameTake({ quiz, layout, answers, flagged, onAnswer, onToggleFlag, onFinish, onXp, xp }: QuizGameTakeProps) {
  const firstOpen = Math.max(0, layout.findIndex(({ questionIndex }) => answers[questionIndex] < 0));
  const [step, setStep] = useState(firstOpen);
  const [combo, setCombo] = useState(0);
  const [popup, setPopup] = useState<{ text: string; key: number } | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [elapsed, setElapsed] = useState(0);
  const shownAt = useRef(Date.now());
  const scored = useRef<Set<number>>(new Set(layout.filter(({ questionIndex }) => answers[questionIndex] >= 0).map(({ questionIndex }) => questionIndex)));

  const window_ = quiz.questionSeconds ?? DEFAULT_FAST_SECONDS;
  const { questionIndex, optionOrder } = layout[step];
  const question = quiz.questions[questionIndex];
  const answered = answers.filter((answer) => answer >= 0).length;
  const isLast = step === layout.length - 1;

  // Restart the question clock whenever a new question appears.
  useEffect(() => {
    shownAt.current = Date.now();
    setElapsed(0);
    const interval = window.setInterval(() => setElapsed((Date.now() - shownAt.current) / 1000), 250);
    return () => window.clearInterval(interval);
  }, [step]);

  const choose = (optionIndex: number) => {
    onAnswer(questionIndex, optionIndex);
    if (scored.current.has(questionIndex)) {
      play('select');
      return;
    }
    scored.current.add(questionIndex);
    const seconds = (Date.now() - shownAt.current) / 1000;
    const fast = seconds <= window_;
    const nextCombo = fast ? combo + 1 : 0;
    const multiplier = 1 + Math.min(nextCombo, 4) * 0.25;
    const base = question.points * 10;
    const gained = Math.round((base + (fast ? base * 0.5 : 0)) * multiplier);
    setCombo(nextCombo);
    onXp(gained);
    setPopup({ text: `+${gained} XP${fast ? ' ⚡ fast' : ''}${nextCombo >= 2 ? ` · ×${multiplier.toFixed(2)} combo` : ''}`, key: Date.now() });
    play(nextCombo >= 2 ? 'combo' : 'select');
  };

  const remaining = Math.max(0, window_ - elapsed);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="badge-gold" aria-label={`Quest XP ${xp}`}>★ {xp} XP</span>
        <span className={combo >= 2 ? 'badge-leaf' : 'badge-neutral'}>🔥 Combo ×{(1 + Math.min(combo, 4) * 0.25).toFixed(2)}</span>
        <span className="badge-neutral">{answered}/{layout.length} answered</span>
        <button
          type="button"
          className="ml-auto text-muted hover:text-parchment"
          aria-pressed={muted}
          onClick={() => { setMuted(!muted); setMutedState(!muted); }}
        >
          {muted ? '🔇 Sound off' : '🔊 Sound on'}
        </button>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={layout.length} aria-valuenow={answered}>
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-leaf transition-all duration-500" style={{ width: `${(answered / layout.length) * 100}%` }} />
      </div>

      <div key={step} className="animate-fade-in rounded-2xl border border-night-border bg-night-deep/40 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <p className="eyebrow">Question {step + 1} of {layout.length} · {question.points} pt{question.points === 1 ? '' : 's'}</p>
          <button
            type="button"
            onClick={() => onToggleFlag(questionIndex)}
            aria-pressed={flagged.includes(questionIndex)}
            className={`flex-none rounded-md border px-2 py-0.5 text-xs transition ${flagged.includes(questionIndex) ? 'border-gold bg-gold/15 text-gold' : 'border-night-border text-muted hover:text-parchment'}`}
          >
            {flagged.includes(questionIndex) ? '⚑ Flagged' : '⚐ Flag'}
          </button>
        </div>
        <h3 className="mt-3 text-xl font-semibold leading-snug text-parchment">{question.questionText}</h3>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true" title="Answer before the bar runs out for a speed bonus">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${remaining > 0 ? 'bg-gold' : 'bg-white/20'}`}
            style={{ width: `${(remaining / window_) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted">{remaining > 0 ? `⚡ Speed bonus for ${Math.ceil(remaining)}s more` : 'Speed bonus over — take your time'}</p>

        <div role="radiogroup" aria-label={question.questionText} className="mt-5 grid gap-3 sm:grid-cols-2">
          {optionOrder.map((optionIndex, position) => {
            const selected = answers[questionIndex] === optionIndex;
            return (
              <button
                key={optionIndex}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(optionIndex)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left text-sm transition duration-150 active:scale-[0.98] ${
                  selected
                    ? 'border-gold bg-gold/15 text-parchment shadow-[0_0_0_3px_rgba(232,169,60,0.15)]'
                    : 'border-night-border bg-night-deep/60 text-muted hover:border-gold/40 hover:text-parchment'
                }`}
              >
                <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-xs font-bold ${selected ? 'bg-gold text-night' : 'bg-white/10 text-muted'}`}>
                  {String.fromCharCode(65 + position)}
                </span>
                {question.options[optionIndex]}
              </button>
            );
          })}
        </div>

        <p className="mt-3 h-5 text-sm font-medium text-gold" aria-live="polite">
          {popup ? <span key={popup.key} className="animate-fade-in-up inline-block">{popup.text}</span> : null}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
        <ol className="hidden flex-wrap justify-center gap-1.5 sm:flex" aria-label="Jump to a question">
          {layout.map((entry, position) => (
            <li key={entry.questionIndex}>
              <button
                type="button"
                aria-label={`Question ${position + 1}${answers[entry.questionIndex] >= 0 ? ', answered' : ''}`}
                aria-current={position === step ? 'step' : undefined}
                onClick={() => setStep(position)}
                className={`h-2.5 w-2.5 rounded-full transition ${position === step ? 'scale-150 bg-gold' : answers[entry.questionIndex] >= 0 ? 'bg-leaf' : 'bg-white/20'}`}
              />
            </li>
          ))}
        </ol>
        {isLast ? (
          <button type="button" className="btn-primary" onClick={onFinish}>Finish &amp; review →</button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>Next →</button>
        )}
      </div>
    </div>
  );
}
