import type {
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  SubmissionRecord,
  User,
} from '../../../shared/src/types.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { TASKS } from '../data/tasks.data.js';
import { Submission, type SubmissionDocument } from '../models/Submission.js';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function toSubmissionRecord(record: SubmissionDocument): SubmissionRecord {
  return {
    id: String(record._id),
    taskId: record.taskId,
    studentId: String(record.studentId),
    studentName: record.studentName,
    submittedContent: record.submittedContent,
    submittedAt: record.submittedAt.toISOString(),
    ...(record.grade !== undefined ? { grade: record.grade } : {}),
    ...(record.feedback !== undefined ? { feedback: record.feedback } : {}),
    status: record.status,
  };
}

/** Checks the submission request body's shape and that the task id is real. */
export function parseCreateSubmissionRequest(body: unknown): CreateSubmissionRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { taskId, content } = body as Record<string, unknown>;
  if (typeof taskId !== 'string' || typeof content !== 'string') return null;
  const trimmedContent = content.trim();
  if (taskId.length === 0 || trimmedContent.length === 0) return null;
  return { taskId, content: trimmedContent };
}

export async function submitWork(
  user: User,
  request: CreateSubmissionRequest,
): Promise<ServiceResult<SubmissionRecord>> {
  const task = TASKS.find((t) => t.id === request.taskId);
  if (!task) {
    return { ok: false, status: 404, error: `No activity or task found with id "${request.taskId}".` };
  }

  if (!mongoose.isValidObjectId(user.id)) {
    return { ok: false, status: 401, error: 'Your account session is invalid. Please sign in again.' };
  }

  await connectDB();
  const record = await Submission.findOneAndUpdate(
    { taskId: request.taskId, studentId: user.id },
    {
      $set: {
        studentName: user.name,
        submittedContent: request.content,
        submittedAt: new Date(),
        status: 'PENDING',
      },
      $unset: { grade: 1, feedback: 1 },
      $setOnInsert: { taskId: request.taskId, studentId: user.id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return { ok: true, data: toSubmissionRecord(record) };
}

export async function getMySubmissions(user: User): Promise<SubmissionRecord[]> {
  await connectDB();
  const records = await Submission.find({ studentId: user.id }).sort({ submittedAt: -1 });
  return records.map(toSubmissionRecord);
}

export async function getAllSubmissions(): Promise<SubmissionRecord[]> {
  await connectDB();
  const records = await Submission.find().sort({ submittedAt: -1 });
  return records.map(toSubmissionRecord);
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
): Promise<ServiceResult<SubmissionRecord>>;
export async function gradeSubmission(
  submissionId: string,
  request: GradeSubmissionRequest,
): Promise<ServiceResult<SubmissionRecord>> {
  await connectDB();
  if (!mongoose.isValidObjectId(submissionId)) {
    return { ok: false, status: 404, error: 'No submission found with that id.' };
  }

  const submission = await Submission.findById(submissionId);
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

  submission.grade = request.grade;
  submission.feedback = request.feedback?.trim() || undefined;
  submission.status = 'GRADED';
  await submission.save();
  return { ok: true, data: toSubmissionRecord(submission) };
}
