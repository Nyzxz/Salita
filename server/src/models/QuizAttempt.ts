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
  /** The questions as they were when the student took the quiz, so later edits don't change old results. */
  questions: Array<{ questionText: string; options: string[]; correctAnswerIndex: number; points: number }>;
  /** Whether the student may review correct answers for this attempt. */
  reviewable: boolean;
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
    questions: {
      type: [
        {
          _id: false,
          questionText: { type: String, required: true },
          options: { type: [String], required: true },
          correctAnswerIndex: { type: Number, required: true },
          points: { type: Number, required: true },
        },
      ],
      default: [],
    },
    reviewable: { type: Boolean, default: false },
  },
  { timestamps: false },
);

quizAttemptSchema.index({ studentId: 1, completedAt: -1 });
quizAttemptSchema.index({ quizId: 1, completedAt: -1 });

export const QuizAttempt: Model<IQuizAttempt> =
  (mongoose.models.QuizAttempt as Model<IQuizAttempt> | undefined) ??
  mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);