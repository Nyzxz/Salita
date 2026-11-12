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
  late?: boolean;
  attachment?: { id: Types.ObjectId; fileName: string; contentType: string; size: number } | null;
}

/** The file a student attached; the bytes live in the Attachment collection. */
const attachmentSchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, ref: 'Attachment', required: true },
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

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
    late: { type: Boolean, default: false },
    attachment: { type: attachmentSchema, default: undefined },
  },
  { timestamps: true },
);

submissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });
// The grading lists filter by status and sort newest first.
submissionSchema.index({ status: 1, submittedAt: -1 });
submissionSchema.index({ submittedAt: -1 });

export const Submission: Model<SubmissionDocument> =
  (mongoose.models.Submission as Model<SubmissionDocument> | undefined) ??
  mongoose.model<SubmissionDocument>('Submission', submissionSchema);