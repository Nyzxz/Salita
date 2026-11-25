import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface NotificationDocument extends Document {
  userId: Types.ObjectId;
  title: string;
  body: string;
  link?: string;
  /** Set on automatic reminders so the same one is only ever sent once. */
  dedupeKey?: string;
  readAt?: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 400 },
  link: { type: String, maxlength: 200 },
  dedupeKey: { type: String, maxlength: 120 },
  readAt: { type: Date, default: null },
  // Old notifications clean themselves up after 30 days.
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });

export const Notification: Model<NotificationDocument> =
  (mongoose.models.Notification as Model<NotificationDocument> | undefined) ??
  mongoose.model<NotificationDocument>('Notification', notificationSchema);
