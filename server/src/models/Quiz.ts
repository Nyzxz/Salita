import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface IQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
}

export interface IQuiz extends Document {
  title: string;
  description: string;
  timeLimitMinutes?: number;
  gradeLevel?: string;
  questions: IQuestion[];
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    questionText: { type: String, required: true, trim: true, maxlength: 500 },
    options: { type: [String], required: true, validate: (values: string[]) => values.length === 4 },
    correctAnswerIndex: { type: Number, required: true, min: 0, max: 3 },
    points: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    timeLimitMinutes: { type: Number, min: 1, max: 600 },
    gradeLevel: { type: String, enum: ['ALL', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'], default: 'ALL' },
    questions: { type: [questionSchema], required: true, validate: (items: IQuestion[]) => items.length > 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Quiz: Model<IQuiz> =
  (mongoose.models.Quiz as Model<IQuiz> | undefined) ??
  mongoose.model<IQuiz>('Quiz', quizSchema);