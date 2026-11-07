import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

/** When a student opened a timed quiz, so the server can enforce its time limit. */
export interface IQuizStart extends Document {
  quizId: Types.ObjectId;
  studentId: Types.ObjectId;
  startedAt: Date;
}

const quizStartSchema = new Schema<IQuizStart>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Stale start records clean themselves up a day later (the longest quiz is 10 hours).
  startedAt: { type: Date, required: true, default: Date.now, index: { expireAfterSeconds: 60 * 60 * 24 } },
});

quizStartSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export const QuizStart: Model<IQuizStart> =
  (mongoose.models.QuizStart as Model<IQuizStart> | undefined) ??
  mongoose.model<IQuizStart>('QuizStart', quizStartSchema);
