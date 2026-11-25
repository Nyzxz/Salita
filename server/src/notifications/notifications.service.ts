import mongoose from 'mongoose';
import type { NotificationFeed } from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { matchesGrade } from '../grades.js';
import { liveFilter } from '../publishing.js';
import { LearningContent } from '../models/LearningContent.js';
import { Notification } from '../models/Notification.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Submission } from '../models/Submission.js';
import { User as UserModel } from '../models/User.js';

export interface NewNotification {
  title: string;
  body: string;
  link?: string;
}

const MAX_RECIPIENTS = 2000;

/**
 * Notifications are a convenience: if writing one fails, the action that
 * caused it (publishing, grading, submitting) must still succeed.
 */
async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error('Could not create notifications:', error);
  }
}

export async function notifyUsers(userIds: readonly string[], notification: NewNotification): Promise<void> {
  await safely(async () => {
    const ids = userIds.filter((id) => mongoose.isValidObjectId(id)).slice(0, MAX_RECIPIENTS);
    if (ids.length === 0) return;
    await connectDB();
    await Notification.insertMany(ids.map((userId) => ({ userId, ...notification })));
  });
}

/** Tells the active students of a grade (or every active student, for 'ALL') about new content. */
export async function notifyStudentsOfGrade(gradeLevel: string, notification: NewNotification): Promise<void> {
  await safely(async () => {
    await connectDB();
    const filter = gradeLevel === 'ALL'
      ? { role: 'STUDENT' as const, status: 'ACTIVE' as const }
      : { role: 'STUDENT' as const, status: 'ACTIVE' as const, section: gradeLevel };
    const students = await UserModel.find(filter).select('_id').limit(MAX_RECIPIENTS).lean();
    await notifyUsers(students.map((student) => String(student._id)), notification);
  });
}

export async function notifyTeachers(notification: NewNotification): Promise<void> {
  await safely(async () => {
    await connectDB();
    const teachers = await UserModel.find({ role: 'TEACHER' as const, status: 'ACTIVE' as const }).select('_id').lean();
    await notifyUsers(teachers.map((teacher) => String(teacher._id)), notification);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Adds a reminder for each quiz or task the student has not done that closes within the next
 * day. Each reminder is created once (it carries a key), so opening the bell again adds nothing.
 */
export async function ensureDueSoonReminders(student: { id: string; section?: string }): Promise<void> {
  await safely(async () => {
    await connectDB();
    const now = new Date();
    const horizon = new Date(now.getTime() + DAY_MS);
    const window = { $gt: now, $lte: horizon };
    const [quizzes, tasks, attempted, submitted] = await Promise.all([
      Quiz.find({ dueDate: window, ...liveFilter() }).select('title dueDate gradeLevel').lean(),
      LearningContent.find({ type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] }, dueDate: window, ...liveFilter() }).select('title dueDate gradeLevel type').lean(),
      QuizAttempt.distinct('quizId', { studentId: student.id }),
      Submission.distinct('taskId', { studentId: student.id }),
    ]);
    const done = new Set([...attempted.map(String), ...submitted.map(String)]);
    const reminders: { key: string; title: string; body: string; link: string }[] = [];
    for (const quiz of quizzes) {
      if (done.has(String(quiz._id)) || !matchesGrade(quiz.gradeLevel, student.section)) continue;
      reminders.push({ key: `due:quiz:${String(quiz._id)}`, title: 'Quiz closes soon', body: `“${quiz.title}” closes within 24 hours.`, link: '/dashboard/student#quizzes' });
    }
    for (const task of tasks) {
      if (done.has(String(task._id)) || !matchesGrade(task.gradeLevel, student.section)) continue;
      const isActivity = task.type === 'ACTIVITY';
      reminders.push({
        key: `due:task:${String(task._id)}`,
        title: isActivity ? 'Activity due soon' : 'Performance task due soon',
        body: `“${task.title ?? 'Untitled'}” is due within 24 hours.`,
        link: isActivity ? '/dashboard/student#activities' : '/dashboard/student#performance',
      });
    }
    await Promise.all(
      reminders.map((reminder) =>
        Notification.updateOne(
          { userId: student.id, dedupeKey: reminder.key },
          { $setOnInsert: { title: reminder.title, body: reminder.body, link: reminder.link, createdAt: new Date() } },
          { upsert: true },
        ).catch((error: unknown) => {
          // Two requests racing to create the same reminder: the loser is simply ignored.
          if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
        }),
      ),
    );
  });
}

export async function listNotifications(userId: string, limit = 30): Promise<NotificationFeed> {
  await connectDB();
  const [records, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(limit, 100)).lean(),
    Notification.countDocuments({ userId, readAt: null }),
  ]);
  return {
    unreadCount,
    items: records.map((record) => ({
      id: String(record._id),
      title: record.title,
      body: record.body,
      ...(record.link ? { link: record.link } : {}),
      createdAt: record.createdAt.toISOString(),
      read: Boolean(record.readAt),
    })),
  };
}

/** Marks the given notifications (or all of them) as read. */
export async function markNotificationsRead(userId: string, ids: readonly string[] | 'all'): Promise<void> {
  await connectDB();
  const filter =
    ids === 'all'
      ? { userId, readAt: null }
      : { userId, readAt: null, _id: { $in: ids.filter((id) => mongoose.isValidObjectId(id)) } };
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
}

export function parseMarkReadRequest(body: unknown): readonly string[] | 'all' | null {
  if (typeof body !== 'object' || body === null) return null;
  const { ids, all } = body as Record<string, unknown>;
  if (all === true) return 'all';
  if (Array.isArray(ids) && ids.length > 0 && ids.length <= 100 && ids.every((id) => typeof id === 'string')) return ids as string[];
  return null;
}

/** Where a live stream writes to, so the same loop serves Express and Vercel. */
export interface EventSink {
  write(chunk: string): void;
  isClosed(): boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Server-sent events for one signed-in user. It watches that user's notifications
 * and sends an `update` event whenever something new arrives, which tells the
 * browser to refresh. The stream ends on its own after `maxMs` (serverless
 * functions have a time limit) and the browser reconnects.
 */
export async function streamNotificationEvents(
  userId: string,
  sink: EventSink,
  options: { maxMs?: number; pollMs?: number; heartbeatMs?: number } = {},
): Promise<void> {
  const { maxMs = 50_000, pollMs = 2_000, heartbeatMs = 15_000 } = options;
  await connectDB();
  const snapshot = async (): Promise<string> => {
    const [latest, unread] = await Promise.all([
      Notification.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean(),
      Notification.countDocuments({ userId, readAt: null }),
    ]);
    return `${latest ? latest.createdAt.getTime() : 0}:${unread}`;
  };

  const started = Date.now();
  let lastSeen = await snapshot();
  let lastWrite = Date.now();
  sink.write('retry: 3000\n\n');
  sink.write(`event: ready\ndata: {}\n\n`);

  while (!sink.isClosed() && Date.now() - started < maxMs) {
    await sleep(pollMs);
    if (sink.isClosed()) break;
    const current = await snapshot();
    if (current !== lastSeen) {
      lastSeen = current;
      lastWrite = Date.now();
      sink.write(`event: update\ndata: {}\n\n`);
    } else if (Date.now() - lastWrite >= heartbeatMs) {
      lastWrite = Date.now();
      sink.write(': keep-alive\n\n');
    }
  }
  if (!sink.isClosed()) sink.write(`event: bye\ndata: {}\n\n`);
}
