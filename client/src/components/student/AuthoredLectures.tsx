import { useEffect, useMemo, useState } from 'react';
import type { LectureRecord } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import { fetchLectures } from '../../api/content';
import { ApiRequestError } from '../../api/client';
import { loadString, loadStringSet, saveString, saveStringSet } from '../../lib/localSet';
import { BookIcon, CheckIcon } from '../common/icons';
import { EmptyState } from '../ui/EmptyState';
import { Notice } from '../ui/Notice';
import { PageIntro } from '../ui/PageIntro';
import { gradeLabel } from '../ui/GradeSelect';

/** About 200 words a minute, never less than one minute. */
function readingMinutes(lecture: LectureRecord): number {
  const text = `${lecture.word} ${lecture.translation} ${lecture.historicalContext} ${lecture.etymologyOrigin ?? ''}`;
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

export function AuthoredLectures() {
  const { session } = useAuth();
  const userId = session?.user.id ?? 'guest';
  const readKey = `salita.lectures.read.${userId}`;
  const lastKey = `salita.lectures.last.${userId}`;
  const [lectures, setLectures] = useState<LectureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(() => loadStringSet(readKey));
  const [lastId, setLastId] = useState<string | null>(() => loadString(lastKey));
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLectures(session?.token ?? '')
      .then((items) => { if (active) setLectures(items); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof ApiRequestError ? cause.message : 'Could not load teacher lectures.');
      });
    return () => { active = false; };
  }, [session?.token]);

  const toggleOpen = (id: string) => {
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    if (opening) {
      setLastId(id);
      saveString(lastKey, id);
    }
  };

  const toggleRead = (id: string) => {
    setRead((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveStringSet(readKey, next);
      return next;
    });
  };

  const readCount = lectures.filter((lecture) => read.has(lecture.id)).length;
  const resume = useMemo(
    () => lectures.find((lecture) => lecture.id === lastId && !read.has(lecture.id)) ?? lectures.find((lecture) => !read.has(lecture.id)),
    [lectures, lastId, read],
  );

  return (
    <section aria-labelledby="teacher-lectures-heading" className="flex flex-col gap-6">
      <PageIntro
        id="teacher-lectures-heading"
        eyebrow="From your teacher"
        title="Teacher lectures"
        description="Words, translations, and cultural context from your teacher."
      />
      {error && <Notice tone="error">{error}</Notice>}

      {lectures.length > 0 && (
        <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-parchment">{readCount} of {lectures.length} lectures read</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={lectures.length} aria-valuenow={readCount}>
              <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${(readCount / lectures.length) * 100}%` }} />
            </div>
          </div>
          {resume ? (
            <button type="button" className="btn-secondary btn-sm flex-none" onClick={() => { setOpenId(resume.id); setLastId(resume.id); saveString(lastKey, resume.id); document.getElementById(`lecture-${resume.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
              {read.size === 0 && !lastId ? 'Start with' : 'Continue with'} “{resume.word}”
            </button>
          ) : (
            <span className="badge-leaf flex-none">All caught up</span>
          )}
        </div>
      )}

      {lectures.length === 0 && !error ? (
        <EmptyState
          icon={<BookIcon />}
          title="No lectures published yet"
          description="Lectures your teacher writes will show up here. In the meantime, explore the vocabulary below."
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lectures.map((lecture) => {
            const isRead = read.has(lecture.id);
            const isOpen = openId === lecture.id;
            return (
              <li id={`lecture-${lecture.id}`} key={lecture.id} className="surface-interactive flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold text-parchment">{lecture.word}</h3>
                  <div className="flex flex-none flex-wrap justify-end gap-1.5">
                    {isRead && <span className="badge-leaf"><CheckIcon className="h-3 w-3" />Read</span>}
                    <span className="badge-gold">{gradeLabel(lecture.gradeLevel)}</span>
                    <span className="badge-neutral capitalize">{lecture.category}</span>
                  </div>
                </div>
                <p className="mt-1.5 text-sm font-medium text-gold">{lecture.translation}</p>
                <p className="mt-0.5 text-xs italic text-muted">/{lecture.phonetic}/</p>
                <p className={`mt-4 text-sm leading-relaxed text-muted ${isOpen ? '' : 'line-clamp-3'}`}>{lecture.historicalContext}</p>
                {isOpen && lecture.etymologyOrigin && (
                  <p className="pt-4"><span className="badge-gold">Origin · {lecture.etymologyOrigin}</span></p>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                  <span className="text-xs text-muted">{readingMinutes(lecture)} min read</span>
                  <span className="flex gap-2">
                    <button type="button" className="btn-ghost btn-sm" aria-expanded={isOpen} onClick={() => toggleOpen(lecture.id)}>
                      {isOpen ? 'Show less' : 'Read'}
                    </button>
                    <button type="button" className={isRead ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} aria-pressed={isRead} onClick={() => toggleRead(lecture.id)}>
                      {isRead ? 'Mark unread' : 'Mark as read'}
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
