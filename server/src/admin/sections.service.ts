import mongoose from 'mongoose';
import type { ClassSectionRecord, GradeLevel } from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { isGradeLevel } from '../grades.js';
import { ClassSection } from '../models/ClassSection.js';
import { User as UserModel } from '../models/User.js';

export type SectionResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const MAX_NAME = 40;

function toRecord(record: { _id: unknown; grade: string; name: string }): ClassSectionRecord {
  return { id: String(record._id), grade: record.grade as GradeLevel, name: record.name };
}

export function parseCreateSectionRequest(body: unknown): { grade: GradeLevel; name: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { grade, name } = body as Record<string, unknown>;
  if (typeof grade !== 'string' || !isGradeLevel(grade) || typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0 || trimmed.length > MAX_NAME) return null;
  return { grade, name: trimmed };
}

export async function listSections(): Promise<ClassSectionRecord[]> {
  await connectDB();
  const records = await ClassSection.find().sort({ grade: 1, name: 1 }).limit(500).lean();
  return records.map(toRecord);
}

export async function createSection(request: { grade: GradeLevel; name: string }): Promise<SectionResult<ClassSectionRecord>> {
  await connectDB();
  try {
    const record = await ClassSection.create(request);
    return { ok: true, data: toRecord(record) };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      return { ok: false, status: 409, error: `${request.grade} already has a section called “${request.name}”.` };
    }
    throw error;
  }
}

/** Removing a section keeps the students; they just no longer belong to a section. */
export async function deleteSection(id: string): Promise<SectionResult<{ id: string; studentsCleared: number }>> {
  if (!mongoose.isValidObjectId(id)) return { ok: false, status: 404, error: 'Section not found.' };
  await connectDB();
  const removed = await ClassSection.findByIdAndDelete(id);
  if (!removed) return { ok: false, status: 404, error: 'Section not found.' };
  const cleared = await UserModel.updateMany(
    { role: 'STUDENT', section: removed.grade, classSection: removed.name },
    { $unset: { classSection: 1 } },
  );
  return { ok: true, data: { id, studentsCleared: cleared.modifiedCount } };
}

/** True when the teacher has made a section with this name for this grade. */
export async function sectionExists(grade: string, name: string): Promise<boolean> {
  await connectDB();
  return (await ClassSection.exists({ grade, name })) !== null;
}
