import { useEffect, useState } from 'react';
import type { LectureRecord } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import { fetchLectures } from '../../api/content';
import { ApiRequestError } from '../../api/client';

export function AuthoredLectures() {
  const { session } = useAuth();
  const [lectures, setLectures] = useState<LectureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLectures(session?.token ?? '')
      .then((items) => { if (active) setLectures(items); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof ApiRequestError ? cause.message : 'Could not load teacher lectures.');
      });
    return () => { active = false; };
  }, [session?.token]);

  return (
    <section aria-labelledby="teacher-lectures-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="teacher-lectures-heading" className="font-display text-2xl font-semibold text-parchment">Teacher lectures</h2>
        <p className="mt-1 text-sm text-muted">Words, translations, and cultural context from your teacher.</p>
      </div>
      {error && <p role="alert" className="text-sm text-clay">{error}</p>}
      {lectures.length === 0 && !error ? (
        <p className="rounded-lg border border-night-border bg-night-panel p-5 text-sm text-muted">No teacher lectures have been published yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lectures.map((lecture) => (
            <li key={lecture.id} className="rounded-lg border border-night-border bg-night-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-parchment">{lecture.word}</h3>
                <span className="rounded-full border border-night-border px-2 py-0.5 text-xs capitalize text-muted">{lecture.category}</span>
              </div>
              <p className="mt-1 text-sm text-gold">{lecture.translation}</p>
              <p className="mt-1 text-xs text-muted">/{lecture.phonetic}/</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{lecture.historicalContext}</p>
              {lecture.etymologyOrigin && <p className="mt-3 text-xs text-muted">Origin: {lecture.etymologyOrigin}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}