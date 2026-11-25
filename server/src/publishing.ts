import type { PublishingFields } from '../../shared/src/types.js';

/** Fields every schedulable collection stores. */
export interface PublishingDoc {
  publishAt?: Date | null;
  isDraft?: boolean | null;
}

export function isLive(doc: PublishingDoc, now: number = Date.now()): boolean {
  if (doc.isDraft) return false;
  return !doc.publishAt || doc.publishAt.getTime() <= now;
}

/** MongoDB filter that matches only live items. */
export function liveFilter(now: Date = new Date()): Record<string, unknown> {
  return {
    isDraft: { $ne: true },
    $or: [{ publishAt: null }, { publishAt: { $exists: false } }, { publishAt: { $lte: now } }],
  };
}

/** Teacher-facing flags (only present when they matter). */
export function publishingFlags(doc: PublishingDoc): PublishingFields {
  return {
    ...(doc.isDraft ? { draft: true } : {}),
    ...(doc.publishAt && doc.publishAt.getTime() > Date.now() ? { publishAt: doc.publishAt.toISOString() } : {}),
  };
}

/** Reads `draft` / `publishAt` from a request body; null means the values were invalid. */
export function parsePublishing(body: Record<string, unknown>): { isDraft: boolean; publishAt: Date | null } | null {
  const { draft, publishAt } = body;
  if (draft !== undefined && typeof draft !== 'boolean') return null;
  if (publishAt !== undefined && (typeof publishAt !== 'string' || !Number.isFinite(Date.parse(publishAt)))) return null;
  return { isDraft: draft === true, publishAt: typeof publishAt === 'string' ? new Date(publishAt) : null };
}

/** True when saving this item should tell students about it right away. */
export function announcesNow(p: { isDraft: boolean; publishAt: Date | null }): boolean {
  return !p.isDraft && (!p.publishAt || p.publishAt.getTime() <= Date.now());
}
