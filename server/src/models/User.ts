import bcrypt from 'bcryptjs';
import mongoose, { type Document, type Model, Schema } from 'mongoose';
import type { UserRole } from '../../../shared/src/types.js';

export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface UserDocument extends Document {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  section?: string;
  status: AccountStatus;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['STUDENT', 'TEACHER'], required: true },
    section: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>('User', userSchema);