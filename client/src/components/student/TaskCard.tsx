import { useRef, useState } from 'react';
import { formatDateTime } from '../../lib/dates';
import type { ActivityTask, SubmissionRecord } from '@shared/types';
import { ClockIcon, PaperclipIcon, TargetIcon } from '../common/icons';
import { downloadAttachment, uploadAttachment } from '../../api/tasks';
import { saveBlob } from '../../api/client';
import { LIMITS } from '../../lib/limits';
import { Notice } from '../ui/Notice';
import { AttachmentAudio } from '../common/AttachmentAudio';
import { VoiceRecorder } from './VoiceRecorder';
import { gradeLabel } from '../ui/GradeSelect';

interface TaskCardProps {
  task: ActivityTask;
  submission?: SubmissionRecord;
  onSubmit: (taskId: string, content: string, attachmentId?: string) => Promise<void>;
}

const MAX_FILE_BYTES = 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.txt';

function formatSize(bytes: number): string {
  return bytes < 1024 * 100 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Reads a file as base64 without the data-URL prefix. */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

const formatDueDate = formatDateTime;

/** Unsent text is kept in this browser so a stray click or refresh doesn't lose it. */
function draftKey(taskId: string): string {
  return `salita.draft.${taskId}`;
}
function loadDraft(taskId: string): string {
  try {
    return window.localStorage.getItem(draftKey(taskId)) ?? '';
  } catch {
    return '';
  }
}
function saveDraft(taskId: string, text: string): void {
  try {
    if (text) window.localStorage.setItem(draftKey(taskId), text);
    else window.localStorage.removeItem(draftKey(taskId));
  } catch {
    /* storage unavailable: drafts are a convenience only */
  }
}

export function TaskCard({ task, submission, onSubmit }: TaskCardProps) {
  const [content, setContent] = useState(submission?.submittedContent ?? loadDraft(task.id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canAttach = true;

  const isOverdue = new Date(task.dueDate).getTime() < Date.now() && !submission;
  const isPastDue = new Date(task.dueDate).getTime() < Date.now();
  const hasDraft = !submission && content.length > 0;

  const handleChange = (text: string) => {
    setContent(text);
    saveDraft(task.id, text);
  };

  const handleSubmit = async () => {
    if (content.trim().length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      let attachmentId: string | undefined;
      if (file) {
        const info = await uploadAttachment({
          taskId: task.id,
          fileName: file.name,
          contentType: file.type,
          dataBase64: await readAsBase64(file),
        });
        attachmentId = info.id;
      }
      await onSubmit(task.id, content.trim(), attachmentId);
      saveDraft(task.id, '');
      setFile(null);
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
            <span className="badge-gold">{gradeLabel(task.gradeLevel)}</span>
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <span className={status.cls}>{status.label}</span>
          {submission?.late && <span className="badge-clay">Submitted late</span>}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted">{task.description}</p>

      {task.rubric && task.rubric.length > 0 && (
        <div className="rounded-xl border border-night-border p-4">
          <p className="eyebrow">How this is graded</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {task.rubric.map((criterion, index) => {
              const score = submission?.status === 'GRADED' ? submission.rubricScores?.[index] : undefined;
              return (
                <li key={criterion.name + index} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-parchment">{criterion.name}</span>
                    <span className={score ? 'badge-leaf' : 'text-xs text-muted'}>
                      {score ? `${score.points} / ${criterion.maxPoints}` : `up to ${criterion.maxPoints} pts`}
                    </span>
                  </div>
                  {criterion.description && <span className="text-xs text-muted">{criterion.description}</span>}
                  {score?.feedback && <span className="text-xs text-gold">Teacher: {score.feedback}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {submission && (
        <p className="rounded-xl border border-night-border bg-white/[0.02] px-3 py-2 text-xs text-muted">
          Submitted {formatDateTime(submission.submittedAt)} · {submission.attachment ? '1 file attached' : 'no file'}
          {submission.status === 'GRADED' ? ` · Graded ${submission.grade}/${task.totalPoints}` : ' · Waiting for your teacher to grade it'}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-night-border pt-5">
        <label htmlFor={`submission-${task.id}`} className="field-label mb-0">
          {submission ? 'Your submission (resubmitting replaces it)' : 'Your response'}
        </label>
        <textarea
          id={`submission-${task.id}`}
          value={content}
          onChange={(event) => handleChange(event.target.value)}
          rows={4}
          maxLength={LIMITS.submission}
          className="field"
          placeholder="Write your response here…"
        />
        {isPastDue && (
          <p className="rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-xs text-parchment/90">
            This is past its due date. You can still submit, but your teacher will see it marked as late.
          </p>
        )}
        <p className="flex justify-between text-xs text-muted">
          <span>{hasDraft ? 'Draft saved in this browser until you submit.' : ''}</span>
          <span className={content.length > LIMITS.submission * 0.9 ? 'text-clay' : ''}>{content.length.toLocaleString()} / {LIMITS.submission.toLocaleString()}</span>
        </p>
        {canAttach && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-label="Attach a file"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                event.target.value = '';
                if (picked && picked.size > MAX_FILE_BYTES) {
                  setError('That file is too large. The limit is 1 MB.');
                  return;
                }
                setError(null);
                setFile(picked);
              }}
            />
            <button type="button" className="btn-secondary btn-sm" onClick={() => fileInput.current?.click()}>
              <PaperclipIcon className="h-3.5 w-3.5" /> {file || submission?.attachment ? 'Change file' : 'Attach a file'}
            </button>
            <span className="text-xs text-muted">
              {file
                ? `${file.name} (${formatSize(file.size)})`
                : submission?.attachment
                  ? `Attached: ${submission.attachment.fileName}`
                  : 'Optional · PDF, PNG, JPG, DOCX or TXT, up to 1 MB (or record your voice below)'}
            </span>
            {file && <button type="button" className="btn-ghost btn-sm" onClick={() => setFile(null)}>Remove</button>}
            {!file && submission?.attachment && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => void downloadAttachment(submission.attachment!.id).then((blob) => saveBlob(blob, submission.attachment!.fileName)).catch(() => setError('Could not download that file.'))}
              >
                Download
              </button>
            )}
          </div>
        )}
        <VoiceRecorder
          disabled={isSaving}
          onChange={(recorded) => {
            setError(null);
            setFile(recorded);
          }}
        />
        {submission?.attachment?.contentType.startsWith('audio/') && !file && <AttachmentAudio id={submission.attachment.id} />}
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

      {submission?.revisions && submission.revisions.length > 0 && (
        <details className="rounded-xl border border-night-border p-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-parchment">
            Earlier versions ({submission.revisions.length}) — your past answers and your teacher’s comments
          </summary>
          <ol className="mt-3 flex flex-col gap-3">
            {[...submission.revisions].reverse().map((revision) => (
              <li key={revision.submittedAt} className="rounded-xl border border-night-border bg-white/[0.02] p-3">
                <p className="text-xs text-muted">
                  Submitted {formatDateTime(revision.submittedAt)}
                  {revision.grade !== undefined ? ` · graded ${revision.grade}/${task.totalPoints}` : ''}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-parchment/90">{revision.content}</p>
                {revision.feedback && <p className="mt-2 text-xs text-gold">Teacher: {revision.feedback}</p>}
                <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => handleChange(revision.content)}>
                  Start my revision from this version
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}

      {submission?.feedback && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm">
          <p className="eyebrow">Teacher feedback</p>
          <p className="mt-2 leading-relaxed text-parchment/90">{submission.feedback}</p>
        </div>
      )}
    </article>
  );
}
