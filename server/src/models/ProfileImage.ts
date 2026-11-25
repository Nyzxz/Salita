import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface ProfileImageDocument extends Document {
  userId: Types.ObjectId;
  contentType: string;
  data: Buffer;
  updatedAt: Date;
}

const profileImageSchema = new Schema<ProfileImageDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  contentType: { type: String, required: true, maxlength: 40 },
  data: { type: Buffer, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const ProfileImage: Model<ProfileImageDocument> =
  (mongoose.models.ProfileImage as Model<ProfileImageDocument> | undefined) ??
  mongoose.model<ProfileImageDocument>('ProfileImage', profileImageSchema);
