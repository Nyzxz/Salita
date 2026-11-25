import mongoose from 'mongoose';
import {
  VALID_CATEGORIES,
  type ActivityTask,
  type Category,
  type ContentGrade,
  type CreateActivityTaskRequest,
  type BulkContentRequest,
  type BulkContentResult,
  type CreateLectureRequest,
  type RubricCriterion,
  type LectureRecord,
  type TaskType,
  type UpdateActivityTaskRequest,
  type UpdateLectureRequest,
  type User,
} from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { LearningContent, type LearningContentType } from '../models/LearningContent.js';
import { TASKS } from '../data/tasks.data.js';
import { matchesGrade, parseContentGrade } from '../grades.js';
import { LIMITS } from '../limits.js';
import { Attachment } from '../models/Attachment.js';
import { Quiz } from '../models/Quiz.js';
import { Submission } from '../models/Submission.js';
import { announcesNow, liveFilter, parsePublishing, publishingFlags } from '../publishing.js';
import { notifyStudentsOfGrade } from '../notifications/notifications.service.js';

/** Lists are capped so one request can never return an unbounded collection. */
const MAX_LIST = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function publishingRequest(p: { isDraft: boolean; publishAt: Date | null }): { draft?: boolean; publishAt?: string } {
  return { ...(p.isDraft ? { draft: true } : {}), ...(p.publishAt ? { publishAt: p.publishAt.toISOString() } : {}) };
}

/** Reads and checks a rubric: 1–8 criteria, each worth at least one point. */
function parseRubric(value: unknown): RubricCriterion[] | null | undefined {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return undefined;
  if (!Array.isArray(value) || value.length > 8) return null;
  const out: RubricCriterion[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) return null;
    const { name, description, maxPoints } = raw;
    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
      (description !== undefined && (typeof description !== 'string' || description.length > 300)) ||
      typeof maxPoints !== 'number' || !Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 1000
    ) return null;
    out.push({ name: name.trim(), ...(typeof description === 'string' && description.trim() ? { description: description.trim() } : {}), maxPoints });
  }
  return out;
}

export function parseCreateLectureRequest(value: unknown): CreateLectureRequest | null {
  if (!isRecord(value)) return null;
  const { word, translation, phonetic, category, historicalContext, etymologyOrigin } = value;
  const gradeLevel = parseContentGrade(value.gradeLevel);
  if (
    gradeLevel === null ||
    typeof word !== 'string' || !word.trim() ||
    typeof translation !== 'string' || !translation.trim() ||
    typeof phonetic !== 'string' || !phonetic.trim() ||
    typeof category !== 'string' || !VALID_CATEGORIES.includes(category as Category) ||
    typeof historicalContext !== 'string' || !historicalContext.trim() ||
    (etymologyOrigin !== undefined && typeof etymologyOrigin !== 'string') ||
    word.trim().length > LIMITS.short ||
    translation.trim().length > LIMITS.short ||
    phonetic.trim().length > LIMITS.short ||
    historicalContext.trim().length > LIMITS.long ||
    (typeof etymologyOrigin === 'string' && etymologyOrigin.trim().length > LIMITS.short)
  ) return null;
  const publishing = parsePublishing(value);
  if (!publishing) return null;
  return {
    ...publishingRequest(publishing),
    gradeLevel,
    word: word.trim(),
    translation: translation.trim(),
    phonetic: phonetic.trim(),
    category: category as Category,
    historicalContext: historicalContext.trim(),
    ...(typeof etymologyOrigin === 'string' && etymologyOrigin.trim() ? { etymologyOrigin: etymologyOrigin.trim() } : {}),
  };
}

export function parseCreateActivityTaskRequest(value: unknown): CreateActivityTaskRequest | null {
  if (!isRecord(value)) return null;
  const { type, title, description, totalPoints, dueDate } = value;
  const gradeLevel = parseContentGrade(value.gradeLevel);
  if (
    gradeLevel === null ||
    (type !== 'ACTIVITY' && type !== 'PERFORMANCE_TASK') ||
    typeof title !== 'string' || !title.trim() ||
    typeof description !== 'string' || !description.trim() ||
    typeof totalPoints !== 'number' || !Number.isInteger(totalPoints) || totalPoints <= 0 || totalPoints > LIMITS.points ||
    typeof dueDate !== 'string' || !Number.isFinite(Date.parse(dueDate)) ||
    title.trim().length > LIMITS.short ||
    description.trim().length > LIMITS.long
  ) return null;
  const rubric = parseRubric(value.rubric);
  if (rubric === null) return null;
  // A rubric decides the total: the criteria must add up to the points.
  if (rubric && rubric.reduce((sum, criterion) => sum + criterion.maxPoints, 0) !== totalPoints) return null;
  const publishing = parsePublishing(value);
  if (!publishing) return null;
  return { ...publishingRequest(publishing), gradeLevel, type, title: title.trim(), description: description.trim(), totalPoints, dueDate, ...(rubric ? { rubric } : {}) };
}

function toLectureRecord(record: { _id: unknown; gradeLevel?: string; word?: string; translation?: string; phonetic?: string; category?: string; historicalContext?: string; etymologyOrigin?: string; createdAt: Date; publishAt?: Date | null; isDraft?: boolean }): LectureRecord {
  return {
    ...publishingFlags(record),
    id: String(record._id),
    gradeLevel: (record.gradeLevel ?? 'ALL') as ContentGrade,
    word: record.word ?? '',
    translation: record.translation ?? '',
    phonetic: record.phonetic ?? '',
    category: (record.category ?? 'phrases') as Category,
    historicalContext: record.historicalContext ?? '',
    ...(record.etymologyOrigin ? { etymologyOrigin: record.etymologyOrigin } : {}),
    createdAt: record.createdAt.toISOString(),
  };
}

function toActivityTask(record: { _id: unknown; gradeLevel?: string; type: string; title?: string; description?: string; totalPoints?: number; dueDate?: Date; rubric?: RubricCriterion[]; publishAt?: Date | null; isDraft?: boolean }): ActivityTask {
  return {
    ...publishingFlags(record),
    ...(record.rubric && record.rubric.length ? { rubric: record.rubric.map((r) => ({ name: r.name, ...(r.description ? { description: r.description } : {}), maxPoints: r.maxPoints })) } : {}),
    id: String(record._id),
    type: record.type as TaskType,
    gradeLevel: (record.gradeLevel ?? 'ALL') as ContentGrade,
    title: record.title ?? '',
    description: record.description ?? '',
    totalPoints: record.totalPoints ?? 0,
    dueDate: (record.dueDate ?? new Date()).toISOString(),
  };
}

export async function createLecture(user: User, request: CreateLectureRequest): Promise<LectureRecord> {
  await connectDB();
  const { draft, publishAt, ...fields } = request;
  const publishing = { isDraft: draft === true, publishAt: publishAt ? new Date(publishAt) : null };
  const record = await LearningContent.create({ type: 'LECTURE', ...fields, ...publishing, createdBy: user.id });
  if (announcesNow(publishing)) {
    await notifyStudentsOfGrade(request.gradeLevel, {
      title: 'New lecture',
      body: `${request.word} — ${request.translation}`,
      link: '/dashboard/student#lectures',
    });
  }
  return toLectureRecord(record);
}

/** Students only see content for their own grade (or for all grades); teachers see everything. */
function visibleTo<T extends { gradeLevel: string }>(items: T[], viewer?: User): T[] {
  if (!viewer || viewer.role !== 'STUDENT') return items;
  return items.filter((item) => matchesGrade(item.gradeLevel, viewer.section));
}

export async function listLectures(viewer?: User): Promise<LectureRecord[]> {
  await connectDB();
  const students = viewer?.role === 'STUDENT';
  const records = await LearningContent.find({ type: 'LECTURE', ...(students ? liveFilter() : {}) }).sort({ createdAt: -1 }).limit(MAX_LIST).lean();
  return visibleTo(records.map(toLectureRecord), viewer);
}

export async function createActivityTask(user: User, request: CreateActivityTaskRequest): Promise<ActivityTask> {
  await connectDB();
  const record = await LearningContent.create({
    type: request.type,
    gradeLevel: request.gradeLevel,
    title: request.title,
    description: request.description,
    totalPoints: request.totalPoints,
    dueDate: new Date(request.dueDate),
    ...(request.rubric ? { rubric: request.rubric } : {}),
    isDraft: request.draft === true,
    publishAt: request.publishAt ? new Date(request.publishAt) : null,
    createdBy: user.id,
  });
  if (announcesNow({ isDraft: request.draft === true, publishAt: request.publishAt ? new Date(request.publishAt) : null })) {
    await notifyStudentsOfGrade(request.gradeLevel, {
      title: request.type === 'ACTIVITY' ? 'New activity' : 'New performance task',
      body: request.title,
      link: `/dashboard/student#${request.type === 'ACTIVITY' ? 'activities' : 'performance'}`,
    });
  }
  return toActivityTask(record);
}

export async function listActivityTasks(viewer?: User): Promise<ActivityTask[]> {
  await connectDB();
  const records = await LearningContent.find({ type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] }, ...(viewer?.role === 'STUDENT' ? liveFilter() : {}) })
    .sort({ createdAt: -1 })
    .limit(MAX_LIST)
    .lean();
  return visibleTo([...records.map(toActivityTask), ...TASKS], viewer);
}

export async function findActivityTask(taskId: string): Promise<ActivityTask | undefined> {
  const seededTask = TASKS.find((task) => task.id === taskId);
  if (seededTask) return seededTask;
  if (!mongoose.isValidObjectId(taskId)) return undefined;
  await connectDB();
  const record = await LearningContent.findOne({ _id: taskId, type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] } }).lean();
  return record ? toActivityTask(record) : undefined;
}
export type ContentResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const notFound = { ok: false, status: 404, error: 'That item no longer exists.' } as const;

/** Teachers can change only what they published; the built-in sample tasks are read-only. */
function validId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

export async function updateLecture(id: string, request: UpdateLectureRequest): Promise<ContentResult<LectureRecord>> {
  if (!validId(id)) return notFound;
  await connectDB();
  const fields = {
    gradeLevel: request.gradeLevel,
    word: request.word,
    translation: request.translation,
    phonetic: request.phonetic,
    category: request.category,
    historicalContext: request.historicalContext,
    isDraft: request.draft === true,
    publishAt: request.publishAt ? new Date(request.publishAt) : null,
  };
  const record = await LearningContent.findOneAndUpdate(
    { _id: id, type: 'LECTURE' },
    request.etymologyOrigin
      ? { $set: { ...fields, etymologyOrigin: request.etymologyOrigin } }
      : { $set: fields, $unset: { etymologyOrigin: 1 } },
    { new: true, runValidators: true },
  );
  if (!record) return notFound;
  return { ok: true, data: toLectureRecord(record) };
}

export async function deleteLecture(id: string): Promise<ContentResult<{ id: string }>> {
  if (!validId(id)) return notFound;
  await connectDB();
  const deleted = await LearningContent.findOneAndDelete({ _id: id, type: 'LECTURE' });
  return deleted ? { ok: true, data: { id } } : notFound;
}

export async function updateActivityTask(id: string, request: UpdateActivityTaskRequest): Promise<ContentResult<ActivityTask>> {
  if (!validId(id)) return { ok: false, status: 400, error: 'Built-in sample tasks cannot be edited.' };
  await connectDB();
  const existing = await LearningContent.findOne({ _id: id, type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] } });
  if (!existing) return notFound;

  // Lowering the points below an existing grade would leave a grade that exceeds the total.
  if (request.totalPoints < (existing.totalPoints ?? 0)) {
    const highest = await Submission.findOne({ taskId: id, grade: { $gt: request.totalPoints } }).select('_id');
    if (highest) {
      return { ok: false, status: 409, error: 'A student already has a grade higher than that total. Raise the points or change that grade first.' };
    }
  }

  existing.gradeLevel = request.gradeLevel;
  existing.title = request.title;
  existing.description = request.description;
  existing.totalPoints = request.totalPoints;
  existing.dueDate = new Date(request.dueDate);
  existing.rubric = request.rubric;
  existing.isDraft = request.draft === true;
  existing.publishAt = request.publishAt ? new Date(request.publishAt) : null;
  await existing.save();
  return { ok: true, data: toActivityTask(existing) };
}

/** Deleting a task also removes the work students handed in for it. */
export async function deleteActivityTask(id: string): Promise<ContentResult<{ id: string }>> {
  if (!validId(id)) return { ok: false, status: 400, error: 'Built-in sample tasks cannot be deleted.' };
  await connectDB();
  const deleted = await LearningContent.findOneAndDelete({ _id: id, type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] } });
  if (!deleted) return notFound;
  await Promise.all([Submission.deleteMany({ taskId: id }), Attachment.deleteMany({ taskId: id })]);
  return { ok: true, data: { id } };
}

export function parseBulkContentRequest(value: unknown): BulkContentRequest | null {
  if (!isRecord(value)) return null;
  const { action, publishAt, items } = value;
  if (action !== 'publish' && action !== 'draft' && action !== 'schedule' && action !== 'delete') return null;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) return null;
  const parsed: BulkContentRequest['items'] = [];
  for (const raw of items) {
    if (!isRecord(raw)) return null;
    const { kind, id } = raw;
    if ((kind !== 'lecture' && kind !== 'task' && kind !== 'quiz') || typeof id !== 'string' || !mongoose.isValidObjectId(id)) return null;
    parsed.push({ kind, id });
  }
  if (action === 'schedule' && (typeof publishAt !== 'string' || !Number.isFinite(Date.parse(publishAt)))) return null;
  return { action, items: parsed, ...(typeof publishAt === 'string' ? { publishAt } : {}) };
}

/** Publishes, hides, schedules or deletes several items at once. Students are told about items that become visible. */
export async function bulkContent(request: BulkContentRequest): Promise<BulkContentResult> {
  await connectDB();
  let changed = 0;
  for (const { kind, id } of request.items) {
    if (kind === 'quiz') {
      const quiz = await Quiz.findById(id);
      if (!quiz) continue;
      if (request.action === 'delete') {
        await quizDeleteHook(id);
        changed += 1;
        continue;
      }
      const wasLive = isLiveNow(quiz);
      applyPublishing(quiz, request);
      await quiz.save();
      if (!wasLive && isLiveNow(quiz)) {
        await notifyStudentsOfGrade((quiz.gradeLevel ?? 'ALL') as ContentGrade, { title: 'New quiz', body: quiz.title, link: '/dashboard/student#quizzes' });
      }
      changed += 1;
      continue;
    }
    const types: LearningContentType[] = kind === 'lecture' ? ['LECTURE'] : ['ACTIVITY', 'PERFORMANCE_TASK'];
    const record = await LearningContent.findOne({ _id: id, type: { $in: types } });
    if (!record) continue;
    if (request.action === 'delete') {
      await LearningContent.deleteOne({ _id: id });
      if (kind === 'task') await Promise.all([Submission.deleteMany({ taskId: id }), Attachment.deleteMany({ taskId: id })]);
      changed += 1;
      continue;
    }
    const wasLive = isLiveNow(record);
    applyPublishing(record, request);
    await record.save();
    if (!wasLive && isLiveNow(record)) {
      await notifyStudentsOfGrade((record.gradeLevel ?? 'ALL') as ContentGrade, {
        title: kind === 'lecture' ? 'New lecture' : record.type === 'ACTIVITY' ? 'New activity' : 'New performance task',
        body: kind === 'lecture' ? `${record.word ?? ''} — ${record.translation ?? ''}` : record.title ?? '',
        link: `/dashboard/student#${kind === 'lecture' ? 'lectures' : record.type === 'ACTIVITY' ? 'activities' : 'performance'}`,
      });
    }
    changed += 1;
  }
  return { changed, skipped: request.items.length - changed };
}

function isLiveNow(doc: { publishAt?: Date | null; isDraft?: boolean }): boolean {
  return !doc.isDraft && (!doc.publishAt || doc.publishAt.getTime() <= Date.now());
}

function applyPublishing(doc: { publishAt?: Date | null; isDraft?: boolean }, request: BulkContentRequest): void {
  if (request.action === 'publish') {
    doc.isDraft = false;
    doc.publishAt = null;
  } else if (request.action === 'draft') {
    doc.isDraft = true;
    doc.publishAt = null;
  } else {
    doc.isDraft = false;
    doc.publishAt = new Date(request.publishAt ?? Date.now());
  }
}

/** Deleting a quiz also removes its attempts and related records, exactly like deleting it alone. */
async function quizDeleteHook(id: string): Promise<void> {
  const { deleteQuiz } = await import('../quizzes/quizzes.service.js');
  await deleteQuiz(id);
}
