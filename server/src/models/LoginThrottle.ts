import mongoose, { type Document, type Model, Schema } from 'mongoose';

/** Failed sign-in count per network address (stored hashed), expiring on its own via a TTL index. */
export interface LoginThrottleDocument extends Document {
  key: string;
  failures: number;
  expireAt: Date;
}

const loginThrottleSchema = new Schema<LoginThrottleDocument>({
  key: { type: String, required: true, unique: true },
  failures: { type: Number, required: true, default: 0 },
  expireAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const LoginThrottle: Model<LoginThrottleDocument> =
  (mongoose.models.LoginThrottle as Model<LoginThrottleDocument> | undefined) ??
  mongoose.model<LoginThrottleDocument>('LoginThrottle', loginThrottleSchema);
