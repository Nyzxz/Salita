import { useEffect, useState } from 'react';
import type { LectureRecord } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import { fetchLectures } from '../../api/content';
import { ApiRequestError } from '../../api/client';
import { BookIcon } from '../common/icons';
import { EmptyState } from '../ui/EmptyState';
import { Notice } from '../ui/Notice';
import { PageIntro } from '../ui/PageIntro';

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
    <section aria-labelledby="teacher-lectures-heading" className="flex flex-col gap-6">
      <PageIntro
        id="teacher-lectures-heading"
        eyebrow="From your teacher"
        title="Teacher lectures"
        description="Words, translations, and cultural context from your teacher."
      />
      {error && <Notice tone="error">{error}</Notice>}
      {lectures.length === 0 && !error ? (
        <EmptyState
          icon={<BookIcon />}
          title="No lectures published yet"
          description="Lectures your teacher writes will show up here. In the meantime, explore the vocabulary below."
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lectures.map((lecture) => (
            <li key={lecture.id} className="surface-interactive flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-parchment">{lecture.word}</h3>
                <span className="badge-neutral capitalize">{lecture.category}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-gold">{lecture.translation}</p>
              <p className="mt-0.5 text-xs italic text-muted">/{lecture.phonetic}/</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">{lecture.historicalContext}</p>
              {lecture.etymologyOrigin && (
                <p className="mt-auto pt-4">
                  <span className="badge-gold">Origin · {lecture.etymologyOrigin}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
