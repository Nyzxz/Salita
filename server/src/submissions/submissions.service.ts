import type {
  AttachmentInfo,
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  SubmissionRecord,
  UploadAttachmentRequest,
  User,
} from '../../../shared/src/types.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { findActivityTask } from '../content/content.service.js';
import { matchesGrade } from '../grades.js';
import { LIMITS } from '../limits.js';
import { Attachment } from '../models/Attachment.js';
import { LearningContent } from '../models/LearningContent.js';
import { Submission, type SubmissionDocument } from '../models/Submission.js';
import { TASKS } from '../data/tasks.data.js';
import { notifyTeachers, notifyUsers } from '../notifications/notifications.service.js';
import { checkAttachment, safeFileName } from './attachments.js';

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
    ...(record.resubmittedAfterGrade ? { resubmitted: true } : {}),
    ...(record.late ? { late: true } : {}),
    ...(record.attachment
      ? {
          attachment: {
            id: String(record.attachment.id),
            fileName: record.attachment.fileName,
            contentType: record.attachment.contentType,
            size: record.attachment.size,
          },
        }
      : {}),
  };
}

/** Checks the submission request body's shape and that the task id is real. */
export function parseCreateSubmissionRequest(body: unknown): CreateSubmissionRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { taskId, content, attachmentId } = body as Record<string, unknown>;
  if (typeof taskId !== 'string' || typeof content !== 'string') return null;
  if (attachmentId !== undefined && (typeof attachmentId !== 'string' || !mongoose.isValidObjectId(attachmentId))) return null;
  const trimmedContent = content.trim();
  if (taskId.length === 0 || trimmedContent.length === 0 || trimmedContent.length > LIMITS.submission) return null;
  return { taskId, content: trimmedContent, ...(attachmentId ? { attachmentId } : {}) };
}

export async function submitWork(
  user: User,
  request: CreateSubmissionRequest,
): Promise<ServiceResult<SubmissionRecord>> {
  const task = await findActivityTask(request.taskId);
  if (!task) {
    return { ok: false, status: 404, error: `No activity or task found with id "${request.taskId}".` };
  }

  if (!matchesGrade(task.gradeLevel, user.section)) {
    return { ok: false, status: 403, error: 'This task is not assigned to your grade level.' };
  }

  if (!mongoose.isValidObjectId(user.id)) {
    return { ok: false, status: 401, error: 'Your account session is invalid. Please sign in again.' };
  }

  await connectDB();

  let attachment: AttachmentInfo | undefined;
  if (request.attachmentId) {
    const file = await Attachment.findOne({ _id: request.attachmentId, studentId: user.id, taskId: request.taskId }).select('-data');
    if (!file) return { ok: false, status: 400, error: 'That attachment was not found. Upload the file again.' };
    attachment = { id: String(file._id), fileName: file.fileName, contentType: file.contentType, size: file.size };
  }

  const previous = await Submission.findOne({ taskId: request.taskId, studentId: user.id });
  // Resubmitting graded work clears the grade; flag it so the teacher notices it needs re-grading.
  const resubmittedAfterGrade = previous ? previous.status === 'GRADED' || previous.resubmittedAfterGrade === true : false;
  const late = new Date(task.dueDate).getTime() < Date.now();

  const upsert = () =>
    Submission.findOneAndUpdate(
      { taskId: request.taskId, studentId: user.id },
      {
        $set: {
          studentName: user.name,
          submittedContent: request.content,
          submittedAt: new Date(),
          status: 'PENDING',
          resubmittedAfterGrade,
          late,
          ...(attachment ? { attachment: { ...attachment, id: new mongoose.Types.ObjectId(attachment.id) } } : {}),
        },
        $unset: { grade: 1, feedback: 1 },
        $setOnInsert: { taskId: request.taskId, studentId: user.id },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

  let record;
  try {
    record = await upsert();
  } catch (error) {
    // Two concurrent first submissions can collide on the unique (task, student) index; the retry becomes an update.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      record = await upsert();
    } else {
      throw error;
    }
  }

  await notifyTeachers({
    title: previous ? 'Work resubmitted' : 'New submission',
    body: `${user.name} ${previous ? 'resubmitted' : 'submitted'} “${task.title}”${late ? ' (late)' : ''}.`,
    link: '/dashboard/admin/grading',
  });

  return { ok: true, data: toSubmissionRecord(record) };
}

/** Stores one file per student per task (uploading again replaces it) and returns its details. */
export async function uploadAttachment(user: User, request: UploadAttachmentRequest): Promise<ServiceResult<AttachmentInfo>> {
  const task = await findActivityTask(request.taskId);
  if (!task) return { ok: false, status: 404, error: 'No activity or task found for that file.' };
  if (!matchesGrade(task.gradeLevel, user.section)) {
    return { ok: false, status: 403, error: 'This task is not assigned to your grade level.' };
  }
  if (!mongoose.isValidObjectId(user.id)) return { ok: false, status: 401, error: 'Your account session is invalid. Please sign in again.' };

  const bytes = Buffer.from(request.dataBase64, 'base64');
  const fileName = safeFileName(request.fileName);
  const checked = checkAttachment(fileName, request.contentType, bytes);
  if ('error' in checked) return { ok: false, status: 400, error: checked.error };

  await connectDB();
  const file = await Attachment.findOneAndUpdate(
    { taskId: request.taskId, studentId: user.id },
    { $set: { fileName, contentType: checked.contentType, size: bytes.length, data: bytes, createdAt: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).select('-data');
  return { ok: true, data: { id: String(file._id), fileName: file.fileName, contentType: file.contentType, size: file.size } };
}

export function parseUploadAttachmentRequest(body: unknown): UploadAttachmentRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { taskId, fileName, contentType, dataBase64 } = body as Record<string, unknown>;
  if (
    typeof taskId !== 'string' || !taskId ||
    typeof fileName !== 'string' || !fileName || fileName.length > 200 ||
    typeof contentType !== 'string' || contentType.length > 100 ||
    typeof dataBase64 !== 'string' || !dataBase64 || dataBase64.length > 1_500_000
  ) return null;
  return { taskId, fileName, contentType, dataBase64 };
}

/** The file's bytes, for its owner or any teacher. */
export async function readAttachment(
  user: User,
  attachmentId: string,
): Promise<ServiceResult<{ fileName: string; contentType: string; data: Buffer }>> {
  if (!mongoose.isValidObjectId(attachmentId)) return { ok: false, status: 404, error: 'File not found.' };
  await connectDB();
  const file = await Attachment.findById(attachmentId);
  if (!file || (user.role !== 'TEACHER' && String(file.studentId) !== user.id)) {
    return { ok: false, status: 404, error: 'File not found.' };
  }
  return { ok: true, data: { fileName: file.fileName, contentType: file.contentType, data: file.data } };
}

export async function getMySubmissions(user: User): Promise<SubmissionRecord[]> {
  await connectDB();
  const records = await Submission.find({ studentId: user.id }).sort({ submittedAt: -1 }).limit(500);
  return records.map(toSubmissionRecord);
}

export interface SubmissionFilters {
  skip?: number;
  limit?: number;
  status?: 'PENDING' | 'GRADED';
  taskType?: 'ACTIVITY' | 'PERFORMANCE_TASK';
  taskId?: string;
}

export interface SubmissionPage {
  items: SubmissionRecord[];
  total: number;
}

/** The teacher's list: newest first, paginated, and filterable by status or task type. */
export async function getAllSubmissions(filters: SubmissionFilters = {}): Promise<SubmissionPage> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.taskId) query.taskId = filters.taskId;
  if (filters.taskType) {
    const stored = await LearningContent.find({ type: filters.taskType }).select('_id').lean();
    const ids = [
      ...stored.map((task) => String(task._id)),
      ...TASKS.filter((task) => task.type === filters.taskType).map((task) => task.id),
    ];
    query.taskId = filters.taskId ? { $in: ids.filter((id) => id === filters.taskId) } : { $in: ids };
  }
  const [records, total] = await Promise.all([
    Submission.find(query)
      .sort({ submittedAt: -1 })
      .skip(filters.skip ?? 0)
      .limit(filters.limit ?? 50),
    Submission.countDocuments(query),
  ]);
  return { items: records.map(toSubmissionRecord), total };
}

export function parseGradeSubmissionRequest(body: unknown): GradeSubmissionRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { grade, feedback, expectedSubmittedAt } = body as Record<string, unknown>;
  if (typeof grade !== 'number' || !Number.isFinite(grade)) return null;
  if (expectedSubmittedAt !== undefined && (typeof expectedSubmittedAt !== 'string' || !Number.isFinite(Date.parse(expectedSubmittedAt)))) return null;
  const trimmedFeedback = typeof feedback === 'string' ? feedback.trim() : undefined;
  if (trimmedFeedback !== undefined && trimmedFeedback.length > LIMITS.feedback) return null;
  return {
    grade,
    feedback: trimmedFeedback && trimmedFeedback.length > 0 ? trimmedFeedback : undefined,
    ...(typeof expectedSubmittedAt === 'string' ? { expectedSubmittedAt } : {}),
  };
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

  const task = await findActivityTask(submission.taskId);
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

  // One atomic write that only succeeds if the work is still the version the teacher saw: if the
  // student resubmitted meanwhile, or another grader saved first, nothing is overwritten.
  const filter: Record<string, unknown> = { _id: submission._id };
  filter.submittedAt = request.expectedSubmittedAt ? new Date(request.expectedSubmittedAt) : submission.submittedAt;
  const feedback = request.feedback?.trim();
  const updated = await Submission.findOneAndUpdate(
    filter,
    {
      $set: { grade: request.grade, status: 'GRADED', resubmittedAfterGrade: false, ...(feedback ? { feedback } : {}) },
      ...(feedback ? {} : { $unset: { feedback: 1 } }),
    },
    { new: true, runValidators: true },
  );
  if (!updated) {
    return {
      ok: false,
      status: 409,
      error: 'This work changed while you were grading it (the student resubmitted). Review the new version, then save again.',
    };
  }

  await notifyUsers([String(updated.studentId)], {
    title: 'Your work was graded',
    body: `“${task.title}”: ${request.grade} / ${task.totalPoints}${feedback ? ' — feedback left' : ''}.`,
    link: '/dashboard/student#grades',
  });
  return { ok: true, data: toSubmissionRecord(updated) };
}
