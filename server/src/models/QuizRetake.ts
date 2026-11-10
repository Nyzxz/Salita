import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

/** One unused retake a teacher has unlocked for one student on one quiz. */
export interface QuizRetakeDocument extends Document {
  quizId: Types.ObjectId;
  studentId: Types.ObjectId;
  grantedAt: Date;
}

const quizRetakeSchema = new Schema<QuizRetakeDocument>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  grantedAt: { type: Date, default: Date.now, required: true },
});

// Unlocking twice is the same as once; using the retake deletes the grant.
quizRetakeSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export const QuizRetake: Model<QuizRetakeDocument> =
  (mongoose.models.QuizRetake as Model<QuizRetakeDocument> | undefined) ??
  mongoose.model<QuizRetakeDocument>('QuizRetake', quizRetakeSchema);
