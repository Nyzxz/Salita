import type {
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  SubmissionRecord,
  User,
} from '../../../shared/src/types.js';
import { TASKS } from '../data/tasks.data.js';
import {
  listAllSubmissions,
  listSubmissionsForStudent,
  updateSubmissionGrade,
  upsertSubmission,
} from '../data/submissions.store.js';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Checks the submission request body's shape and that the task id is real. */
export function parseCreateSubmissionRequest(body: unknown): CreateSubmissionRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { taskId, content } = body as Record<string, unknown>;
  if (typeof taskId !== 'string' || typeof content !== 'string') return null;
  const trimmedContent = content.trim();
  if (taskId.length === 0 || trimmedContent.length === 0) return null;
  return { taskId, content: trimmedContent };
}

export function submitWork(user: User, request: CreateSubmissionRequest): ServiceResult<SubmissionRecord> {
  const task = TASKS.find((t) => t.id === request.taskId);
  if (!task) {
    return { ok: false, status: 404, error: `No activity or task found with id "${request.taskId}".` };
  }
  const record = upsertSubmission({
    taskId: request.taskId,
    studentId: user.id,
    studentName: user.name,
    content: request.content,
  });
  return { ok: true, data: record };
}

export function getMySubmissions(user: User): SubmissionRecord[] {
  return listSubmissionsForStudent(user.id);
}

export function getAllSubmissions(): SubmissionRecord[] {
  return listAllSubmissions();
}

export function parseGradeSubmissionRequest(body: unknown): GradeSubmissionRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { grade, feedback } = body as Record<string, unknown>;
  if (typeof grade !== 'number' || !Number.isFinite(grade)) return null;
  const trimmedFeedback = typeof feedback === 'string' ? feedback.trim() : undefined;
  return { grade, feedback: trimmedFeedback && trimmedFeedback.length > 0 ? trimmedFeedback : undefined };
}

export function gradeSubmission(
  submissionId: string,
  request: GradeSubmissionRequest,
): ServiceResult<SubmissionRecord> {
  const submission = listAllSubmissions().find((item) => item.id === submissionId);
  if (!submission) {
    return { ok: false, status: 404, error: 'No submission found with that id.' };
  }

  const task = TASKS.find((item) => item.id === submission.taskId);
  if (!task) {
    return { ok: false, status: 404, error: 'No task matches this submission.' };
  }

  if (request.grade < 0 || request.grade > task.totalPoints) {
    return {
      ok: false,
      status: 400,
      error: `Grade must be between 0 and ${task.totalPoints}.`,
    };
  }

  const updated = updateSubmissionGrade(submissionId, request.grade, request.feedback);
  if (!updated) {
    return { ok: false, status: 404, error: 'No submission found with that id.' };
  }

  return { ok: true, data: updated };
}
