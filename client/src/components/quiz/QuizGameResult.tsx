import { useEffect, useRef, useState } from 'react';
import type { QuizAttemptRecord } from '@shared/types';
import { play } from '../../lib/sfx';
import { addXp } from '../../lib/xp';
import { Confetti } from '../common/Confetti';

/** The celebration after a quiz: stars, a count-up of XP, best streak of correct answers. */
export function QuizGameResult({ attempt, quizXp, userId }: { attempt: QuizAttemptRecord; quizXp: number; userId: string }) {
  const review = attempt.review ?? [];
  const correct = review.filter((item) => item.earned > 0).length;
  let best = 0;
  let run = 0;
  for (const item of review) {
    run = item.earned > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const stars = attempt.percentageScore >= 90 ? 3 : attempt.percentageScore >= 70 ? 2 : attempt.percentageScore >= 40 ? 1 : 0;
  const total = quizXp + correct * 10 + best * 5 + (attempt.percentageScore >= 100 ? 50 : 0);
  const [shown, setShown] = useState(0);
  const awarded = useRef(false);

  useEffect(() => {
    if (!awarded.current) {
      awarded.current = true;
      addXp(userId, total);
      play(stars >= 2 ? 'finish' : 'good');
    }
    const started = Date.now();
    const interval = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / 1200);
      setShown(Math.round(total * progress));
      if (progress >= 1) window.clearInterval(interval);
    }, 40);
    return () => window.clearInterval(interval);
  }, [total, userId, stars]);

  const headline = stars === 3 ? 'Outstanding!' : stars === 2 ? 'Great job!' : stars === 1 ? 'Good effort!' : 'Keep practising!';

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-gold/25 bg-gold/5 p-6 text-center">
      {stars >= 2 && <Confetti />}
      <p className="eyebrow">Quest complete</p>
      <h4 className="mt-1 text-2xl font-semibold text-parchment">{headline}</h4>
      <p className="mt-3 text-4xl" aria-label={`${stars} out of 3 stars`}>
        {[0, 1, 2].map((star) => (
          <span key={star} className={star < stars ? 'text-gold' : 'text-white/20'}>★</span>
        ))}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-xs text-muted">XP earned</dt><dd className="mt-1 text-xl font-semibold text-gold">+{shown}</dd></div>
        <div><dt className="text-xs text-muted">Correct</dt><dd className="mt-1 text-xl font-semibold text-parchment">{correct}/{review.length}</dd></div>
        <div><dt className="text-xs text-muted">Best streak</dt><dd className="mt-1 text-xl font-semibold text-parchment">🔥 {best}</dd></div>
      </dl>
      <p className="mt-3 text-[11px] text-muted">XP is just for fun and for your level. Your teacher’s score below is what counts.</p>
    </div>
  );
}
