import mongoose from 'mongoose';
import type { User } from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { ProfileImage } from '../models/ProfileImage.js';
import { User as UserModel } from '../models/User.js';

/** The browser shrinks every photo to a small square first, so this limit is generous. */
export const MAX_AVATAR_BYTES = 200 * 1024;

export type AvatarResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** The upload body is `{ image: "<base64 of a PNG or JPEG>" }`. Checks the real bytes, not the claimed type. */
export function parseAvatarUpload(body: unknown): { contentType: string; bytes: Buffer } | { error: string } {
  const image = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).image : undefined;
  if (typeof image !== 'string' || image.length === 0 || image.length > MAX_AVATAR_BYTES * 2) {
    return { error: 'Choose a picture to upload.' };
  }
  const bytes = Buffer.from(image.replace(/^data:[^,]*,/, ''), 'base64');
  if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) return { error: 'That picture is too large. Try a smaller one.' };
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isJpeg && !isPng) return { error: 'Use a JPG or PNG picture.' };
  return { contentType: isJpeg ? 'image/jpeg' : 'image/png', bytes };
}

/** Saves the picture and bumps `avatarVersion`, which the browser uses to refresh its cached copy. */
export async function saveAvatar(userId: string, upload: { contentType: string; bytes: Buffer }): Promise<number> {
  await connectDB();
  const version = Date.now();
  await ProfileImage.updateOne(
    { userId },
    { $set: { contentType: upload.contentType, data: upload.bytes, updatedAt: new Date(version) } },
    { upsert: true },
  );
  await UserModel.updateOne({ _id: userId }, { $set: { avatarVersion: version } });
  return version;
}

export async function removeAvatar(userId: string): Promise<void> {
  await connectDB();
  await ProfileImage.deleteOne({ userId });
  await UserModel.updateOne({ _id: userId }, { $unset: { avatarVersion: 1 } });
}

/** Anyone signed in may see their own picture; teachers may see students'. */
export async function readAvatar(viewer: User, userId: string): Promise<AvatarResult<{ contentType: string; data: Buffer }>> {
  if (!mongoose.isValidObjectId(userId)) return { ok: false, status: 404, error: 'No picture.' };
  if (viewer.id !== userId && viewer.role !== 'TEACHER') return { ok: false, status: 403, error: 'Your account is not allowed to do that.' };
  await connectDB();
  // Read as a document (not .lean()): lean() hands back a BSON Binary wrapper, which does not copy into a Buffer correctly.
  const image = await ProfileImage.findOne({ userId });
  if (!image) return { ok: false, status: 404, error: 'No picture.' };
  return { ok: true, data: { contentType: image.contentType, data: Buffer.from(image.data) } };
}
