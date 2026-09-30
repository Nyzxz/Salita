import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface IQuizAttempt extends Document {
  quizId: Types.ObjectId;
  quizTitle: string;
  studentId: Types.ObjectId;
  studentName: string;
  userAnswers: number[];
  scoreObtained: number;
  totalPossiblePoints: number;
  percentageScore: number;
  feedback: string;
  completedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    quizTitle: { type: String, required: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String, required: true, trim: true },
    userAnswers: { type: [Number], required: true },
    scoreObtained: { type: Number, required: true, min: 0 },
    totalPossiblePoints: { type: Number, required: true, min: 1 },
    percentageScore: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, required: true },
    completedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);

quizAttemptSchema.index({ studentId: 1, completedAt: -1 });

export const QuizAttempt: Model<IQuizAttempt> =
  (mongoose.models.QuizAttempt as Model<IQuizAttempt> | undefined) ??
  mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);