import { useEffect, useState } from 'react';
import type { Achievements } from '@shared/types';
import { fetchAchievements } from '../../api/auth';
import { onLive } from '../../lib/live';

/** Daily streak plus badges for clearing difficulty tiers and other milestones. */
export function AchievementsPanel() {
  const [data, setData] = useState<Achievements | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetchAchievements()
        .then((result) => active && setData(result))
        .catch(() => undefined);
    };
    load();
    const stop = onLive(load);
    return () => {
      active = false;
      stop();
    };
  }, []);

  if (!data) return null;
  const earned = data.badges.filter((badge) => badge.earned).length;

  return (
    <section aria-labelledby="achievements-heading" className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="achievements-heading" className="text-lg font-semibold text-parchment">Streak &amp; badges</h3>
        <span className={data.currentStreak > 0 ? 'badge-gold' : 'badge-neutral'}>
          {data.currentStreak > 0 ? `${data.currentStreak}-day streak` : 'No streak yet'}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {data.activeToday
          ? `You’re active today. Longest streak: ${data.longestStreak} day${data.longestStreak === 1 ? '' : 's'}.`
          : 'Finish a quiz or submit work today to keep your streak going.'}{' '}
        {earned} of {data.badges.length} badges earned.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.badges.map((badge) => (
          <li
            key={badge.id}
            className={`rounded-xl border px-3 py-2 text-sm ${badge.earned ? 'border-gold/40 bg-gold/10 text-parchment' : 'border-night-border text-muted opacity-70'}`}
          >
            <p className="font-medium">{badge.earned ? '★ ' : '☆ '}{badge.title}</p>
            <p className="text-xs text-muted">{badge.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
