import { useRef, useState } from 'react';
import type { ActivityTask, SubmissionRecord } from '@shared/types';
import { ClockIcon, PaperclipIcon, TargetIcon } from '../common/icons';
import { downloadAttachment, uploadAttachment } from '../../api/tasks';
import { saveBlob } from '../../api/client';
import { LIMITS } from '../../lib/limits';
import { Notice } from '../ui/Notice';
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

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TaskCard({ task, submission, onSubmit }: TaskCardProps) {
  const [content, setContent] = useState(submission?.submittedContent ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canAttach = task.type === 'PERFORMANCE_TASK';

  const isOverdue = new Date(task.dueDate).getTime() < Date.now() && !submission;

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

      <div className="flex flex-col gap-2 border-t border-night-border pt-5">
        <label htmlFor={`submission-${task.id}`} className="field-label mb-0">
          {submission ? 'Your submission (resubmitting replaces it)' : 'Your response'}
        </label>
        <textarea
          id={`submission-${task.id}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          maxLength={LIMITS.submission}
          className="field"
          placeholder="Write your response here…"
        />
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
                  : 'Optional · PDF, PNG, JPG, DOCX or TXT, up to 1 MB'}
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
