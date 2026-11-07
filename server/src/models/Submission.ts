import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface SubmissionDocument extends Document {
  taskId: string;
  studentId: Types.ObjectId;
  studentName: string;
  submittedContent: string;
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  status: 'PENDING' | 'GRADED';
  resubmittedAfterGrade?: boolean;
}

const submissionSchema = new Schema<SubmissionDocument>(
  {
    taskId: { type: String, required: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true, trim: true },
    submittedContent: { type: String, required: true, maxlength: 10000 },
    submittedAt: { type: Date, default: Date.now, required: true },
    grade: { type: Number, min: 0 },
    feedback: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['PENDING', 'GRADED'], default: 'PENDING', required: true },
    resubmittedAfterGrade: { type: Boolean, default: false },
  },
  { timestamps: true },
);

submissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });

export const Submission: Model<SubmissionDocument> =
  (mongoose.models.Submission as Model<SubmissionDocument> | undefined) ??
  mongoose.model<SubmissionDocument>('Submission', submissionSchema);