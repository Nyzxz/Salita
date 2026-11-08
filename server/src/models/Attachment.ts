import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface AttachmentDocument extends Document {
  taskId: string;
  studentId: Types.ObjectId;
  fileName: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const attachmentSchema = new Schema<AttachmentDocument>({
  taskId: { type: String, required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true, maxlength: 200 },
  contentType: { type: String, required: true, maxlength: 100 },
  size: { type: Number, required: true, min: 1 },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
});

// One attachment per student per task; uploading again replaces it.
attachmentSchema.index({ taskId: 1, studentId: 1 }, { unique: true });

export const Attachment: Model<AttachmentDocument> =
  (mongoose.models.Attachment as Model<AttachmentDocument> | undefined) ??
  mongoose.model<AttachmentDocument>('Attachment', attachmentSchema);
