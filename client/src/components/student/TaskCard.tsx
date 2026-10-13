import { useState } from 'react';
import type { ActivityTask, SubmissionRecord } from '@shared/types';
import { ClockIcon, TargetIcon } from '../common/icons';
import { Notice } from '../ui/Notice';

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

  const status = submission
    ? submission.status === 'GRADED'
      ? { label: `Graded · ${submission.grade}/${task.totalPoints}`, cls: 'badge-leaf' }
      : { label: 'Submitted', cls: 'badge-gold' }
    : isOverdue
      ? { label: 'Overdue', cls: 'badge-clay' }
      : { label: 'Not submitted', cls: 'badge-neutral' };

  return (
    <article className="surface flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-parchment">{task.title}</h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="h-3.5 w-3.5" />
              Due {formatDueDate(task.dueDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TargetIcon className="h-3.5 w-3.5" />
              {task.totalPoints} points
            </span>
          </p>
        </div>
        <span className={`${status.cls} flex-none`}>{status.label}</span>
      </div>

      <p className="text-sm leading-relaxed text-muted">{task.description}</p>

      <div className="flex flex-col gap-2 border-t border-night-border pt-5">
        <label htmlFor={`submission-${task.id}`} className="field-label mb-0">
          {submission ? 'Your submission (resubmitting replaces it)' : 'Your response'}
        </label>
        <textarea
          id={`submission-${task.id}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          className="field"
          placeholder="Write your response here…"
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="mt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || content.trim().length === 0}
            className="btn-primary"
          >
            {isSaving ? 'Submitting…' : submission ? 'Resubmit' : 'Submit work'}
          </button>
        </div>
      </div>

      {submission?.feedback && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm">
          <p className="eyebrow">Teacher feedback</p>
          <p className="mt-2 leading-relaxed text-parchment/90">{submission.feedback}</p>
        </div>
      )}
    </article>
  );
}
