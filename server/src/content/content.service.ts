import mongoose from 'mongoose';
import {
  VALID_CATEGORIES,
  type ActivityTask,
  type Category,
  type CreateActivityTaskRequest,
  type CreateLectureRequest,
  type LectureRecord,
  type TaskType,
  type User,
} from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { LearningContent } from '../models/LearningContent.js';
import { TASKS } from '../data/tasks.data.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCreateLectureRequest(value: unknown): CreateLectureRequest | null {
  if (!isRecord(value)) return null;
  const { word, translation, phonetic, category, historicalContext, etymologyOrigin } = value;
  if (
    typeof word !== 'string' || !word.trim() ||
    typeof translation !== 'string' || !translation.trim() ||
    typeof phonetic !== 'string' || !phonetic.trim() ||
    typeof category !== 'string' || !VALID_CATEGORIES.includes(category as Category) ||
    typeof historicalContext !== 'string' || !historicalContext.trim() ||
    (etymologyOrigin !== undefined && typeof etymologyOrigin !== 'string')
  ) return null;
  return {
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
  if (
    (type !== 'ACTIVITY' && type !== 'PERFORMANCE_TASK') ||
    typeof title !== 'string' || !title.trim() ||
    typeof description !== 'string' || !description.trim() ||
    typeof totalPoints !== 'number' || !Number.isFinite(totalPoints) || totalPoints <= 0 ||
    typeof dueDate !== 'string' || !Number.isFinite(Date.parse(dueDate))
  ) return null;
  return { type, title: title.trim(), description: description.trim(), totalPoints, dueDate };
}

function toLectureRecord(record: { _id: unknown; word?: string; translation?: string; phonetic?: string; category?: string; historicalContext?: string; etymologyOrigin?: string; createdAt: Date }): LectureRecord {
  return {
    id: String(record._id),
    word: record.word ?? '',
    translation: record.translation ?? '',
    phonetic: record.phonetic ?? '',
    category: (record.category ?? 'phrases') as Category,
    historicalContext: record.historicalContext ?? '',
    ...(record.etymologyOrigin ? { etymologyOrigin: record.etymologyOrigin } : {}),
    createdAt: record.createdAt.toISOString(),
  };
}

function toActivityTask(record: { _id: unknown; type: string; title?: string; description?: string; totalPoints?: number; dueDate?: Date }): ActivityTask {
  return {
    id: String(record._id),
    type: record.type as TaskType,
    title: record.title ?? '',
    description: record.description ?? '',
    totalPoints: record.totalPoints ?? 0,
    dueDate: (record.dueDate ?? new Date()).toISOString(),
  };
}

export async function createLecture(user: User, request: CreateLectureRequest): Promise<LectureRecord> {
  await connectDB();
  const record = await LearningContent.create({ type: 'LECTURE', ...request, createdBy: user.id });
  return toLectureRecord(record);
}

export async function listLectures(): Promise<LectureRecord[]> {
  await connectDB();
  const records = await LearningContent.find({ type: 'LECTURE' }).sort({ createdAt: -1 }).lean();
  return records.map(toLectureRecord);
}

export async function createActivityTask(user: User, request: CreateActivityTaskRequest): Promise<ActivityTask> {
  await connectDB();
  const record = await LearningContent.create({
    type: request.type,
    title: request.title,
    description: request.description,
    totalPoints: request.totalPoints,
    dueDate: new Date(request.dueDate),
    createdBy: user.id,
  });
  return toActivityTask(record);
}

export async function listActivityTasks(): Promise<ActivityTask[]> {
  await connectDB();
  const records = await LearningContent.find({ type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] } })
    .sort({ createdAt: -1 })
    .lean();
  return [...records.map(toActivityTask), ...TASKS];
}

export async function findActivityTask(taskId: string): Promise<ActivityTask | undefined> {
  const seededTask = TASKS.find((task) => task.id === taskId);
  if (seededTask) return seededTask;
  if (!mongoose.isValidObjectId(taskId)) return undefined;
  await connectDB();
  const record = await LearningContent.findOne({ _id: taskId, type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] } }).lean();
  return record ? toActivityTask(record) : undefined;
}