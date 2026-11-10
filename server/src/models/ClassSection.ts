import mongoose, { type Document, type Model, Schema } from 'mongoose';

/** A class section (like "Sampaguita" or "A") within a grade, made by the teacher. */
export interface ClassSectionDocument extends Document {
  grade: string;
  name: string;
  createdAt: Date;
}

const classSectionSchema = new Schema<ClassSectionDocument>({
  grade: { type: String, required: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  createdAt: { type: Date, default: Date.now },
});

classSectionSchema.index({ grade: 1, name: 1 }, { unique: true });

export const ClassSection: Model<ClassSectionDocument> =
  (mongoose.models.ClassSection as Model<ClassSectionDocument> | undefined) ??
  mongoose.model<ClassSectionDocument>('ClassSection', classSectionSchema);
