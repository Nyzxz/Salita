import mongoose, { type Document, type Model, type Types, Schema } from 'mongoose';

export interface QuestionBankItemDocument extends Document {
  createdBy: Types.ObjectId;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
  explanation?: string;
  topic: string;
  difficulty: string;
  createdAt: Date;
}

const questionBankSchema = new Schema<QuestionBankItemDocument>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionText: { type: String, required: true, trim: true, maxlength: 500 },
    options: { type: [{ type: String, trim: true, maxlength: 300 }], required: true },
    correctAnswerIndex: { type: Number, required: true, min: 0, max: 3 },
    points: { type: Number, required: true, min: 1, max: 1000 },
    explanation: { type: String, trim: true, maxlength: 600 },
    topic: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    difficulty: { type: String, required: true, enum: ['EASY', 'MEDIUM', 'INTERMEDIATE', 'HARD'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

questionBankSchema.index({ topic: 1, difficulty: 1 });

export const QuestionBankItem: Model<QuestionBankItemDocument> =
  (mongoose.models.QuestionBankItem as Model<QuestionBankItemDocument> | undefined) ??
  mongoose.model<QuestionBankItemDocument>('QuestionBankItem', questionBankSchema);
