import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';
import type { Category, TaskType } from '../../../shared/src/types.js';

export type LearningContentType = 'LECTURE' | TaskType;

export interface LearningContentDocument extends Document {
  type: LearningContentType;
  gradeLevel?: string;
  word?: string;
  translation?: string;
  phonetic?: string;
  category?: Category;
  historicalContext?: string;
  etymologyOrigin?: string;
  title?: string;
  description?: string;
  totalPoints?: number;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const learningContentSchema = new Schema<LearningContentDocument>(
  {
    type: { type: String, enum: ['LECTURE', 'ACTIVITY', 'PERFORMANCE_TASK'], required: true, index: true },
    gradeLevel: { type: String, enum: ['ALL', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'], default: 'ALL' },
    word: { type: String, trim: true, maxlength: 200 },
    translation: { type: String, trim: true, maxlength: 200 },
    phonetic: { type: String, trim: true, maxlength: 200 },
    category: { type: String, enum: ['greetings', 'food', 'values', 'phrases'] },
    historicalContext: { type: String, trim: true, maxlength: 5000 },
    etymologyOrigin: { type: String, trim: true, maxlength: 200 },
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    totalPoints: { type: Number, min: 1 },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

learningContentSchema.index({ type: 1, createdAt: -1 });

export const LearningContent: Model<LearningContentDocument> =
  (mongoose.models.LearningContent as Model<LearningContentDocument> | undefined) ??
  mongoose.model<LearningContentDocument>('LearningContent', learningContentSchema);