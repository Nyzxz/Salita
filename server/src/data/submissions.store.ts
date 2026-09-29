import type { SubmissionRecord } from '../../../shared/src/types.js';

/**
 * In-memory submissions, keyed loosely by (taskId, studentId). Same Vercel
 * caveat as students.store.ts: writes don't reliably persist across
 * serverless invocations in production — this is built for local dev and as
 * the seam where real storage will plug in later.
 */
export const SUBMISSIONS: SubmissionRecord[] = [];

let nextId = 1;

export interface CreateSubmissionInput {
  taskId: string;
  studentId: string;
  studentName: string;
  content: string;
}

export function listSubmissionsForStudent(studentId: string): SubmissionRecord[] {
  return SUBMISSIONS.filter((s) => s.studentId === studentId);
}

export function listAllSubmissions(): SubmissionRecord[] {
  return [...SUBMISSIONS];
}

export function findSubmission(taskId: string, studentId: string): SubmissionRecord | undefined {
  return SUBMISSIONS.find((s) => s.taskId === taskId && s.studentId === studentId);
}

export function updateSubmissionGrade(
  submissionId: string,
  grade: number,
  feedback?: string,
): SubmissionRecord | undefined {
  const submission = SUBMISSIONS.find((item) => item.id === submissionId);
  if (!submission) return undefined;

  submission.grade = grade;
  submission.feedback = feedback?.trim() ? feedback.trim() : undefined;
  submission.status = 'GRADED';
  return submission;
}

/** Creates a new submission, or overwrites the student's existing one for that task (resubmit). */
export function upsertSubmission(input: CreateSubmissionInput): SubmissionRecord {
  const existing = findSubmission(input.taskId, input.studentId);
  if (existing) {
    existing.submittedContent = input.content;
    existing.submittedAt = new Date().toISOString();
    existing.status = 'PENDING';
    existing.grade = undefined;
    existing.feedback = undefined;
    return existing;
  }
  const record: SubmissionRecord = {
    id: `submission-${nextId++}`,
    taskId: input.taskId,
    studentId: input.studentId,
    studentName: input.studentName,
    submittedContent: input.content,
    submittedAt: new Date().toISOString(),
    status: 'PENDING',
  };
  SUBMISSIONS.push(record);
  return record;
}
