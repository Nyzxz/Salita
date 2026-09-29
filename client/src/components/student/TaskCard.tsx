import { useState } from 'react';
import type { ActivityTask, SubmissionRecord } from '@shared/types';

interface TaskCardProps {
  task: ActivityTask;
  submission?: SubmissionRecord;
  onSubmit: (taskId: string, content: string) => Promise<void>;
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TaskCard({ task, submission, onSubmit }: TaskCardProps) {
  const [content, setContent] = useState(submission?.submittedContent ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverdue = new Date(task.dueDate).getTime() < Date.now() && !submission;

  const handleSubmit = async () => {
    if (content.trim().length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(task.id, content.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-night-border bg-night-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-parchment">{task.title}</h3>
          <p className="mt-1 text-xs text-muted">
            Due {formatDueDate(task.dueDate)} · {task.totalPoints} points
          </p>
        </div>

        {submission ? (
          <span
            className={`flex-none rounded-full border px-3 py-1 text-xs ${
              submission.status === 'GRADED'
                ? 'border-leaf/40 text-leaf'
                : 'border-gold/40 text-gold'
            }`}
          >
            {submission.status === 'GRADED' ? `Graded: ${submission.grade}/${task.totalPoints}` : 'Submitted'}
          </span>
        ) : (
          <span
            className={`flex-none rounded-full border px-3 py-1 text-xs ${
              isOverdue ? 'border-clay/40 text-clay' : 'border-night-border text-muted'
            }`}
          >
            {isOverdue ? 'Overdue' : 'Not submitted'}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted">{task.description}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor={`submission-${task.id}`} className="text-sm text-parchment">
          {submission ? 'Your submission (resubmitting replaces it)' : 'Your response'}
        </label>
        <textarea
          id={`submission-${task.id}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-night-border bg-night px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/60 focus:border-gold"
          placeholder="Write your response here…"
        />
        {error && <p className="text-sm text-clay">{error}</p>}
        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || content.trim().length === 0}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Submitting…' : submission ? 'Resubmit' : 'Submit'}
          </button>
        </div>
      </div>

      {submission?.feedback && (
        <div className="rounded-lg bg-night-raised p-4 text-sm text-muted">
          <p className="font-semibold text-parchment">Teacher feedback</p>
          <p className="mt-1">{submission.feedback}</p>
        </div>
      )}
    </article>
  );
}
