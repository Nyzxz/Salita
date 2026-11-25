import mongoose from 'mongoose';
import type { QuestionBankItemRecord, QuestionBankList, SaveBankQuestionRequest } from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { isDifficulty } from '../difficulty.js';
import { LIMITS } from '../limits.js';
import { QuestionBankItem } from '../models/QuestionBankItem.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseSaveBankQuestionRequest(value: unknown): SaveBankQuestionRequest | null {
  if (!isRecord(value)) return null;
  const { questionText, options, correctAnswerIndex, points, explanation, topic, difficulty } = value;
  if (
    typeof questionText !== 'string' || !questionText.trim() || questionText.trim().length > LIMITS.question ||
    !Array.isArray(options) || options.length !== 4 ||
    options.some((option) => typeof option !== 'string' || !option.trim() || option.trim().length > LIMITS.option) ||
    typeof correctAnswerIndex !== 'number' || !Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex > 3 ||
    typeof points !== 'number' || !Number.isInteger(points) || points < 1 || points > LIMITS.points ||
    (explanation !== undefined && (typeof explanation !== 'string' || explanation.length > 600)) ||
    typeof topic !== 'string' || !topic.trim() || topic.trim().length > 60 ||
    !isDifficulty(difficulty)
  ) return null;
  return {
    questionText: questionText.trim(),
    options: (options as string[]).map((option) => option.trim()),
    correctAnswerIndex,
    points,
    ...(typeof explanation === 'string' && explanation.trim() ? { explanation: explanation.trim() } : {}),
    topic: topic.trim().toLowerCase(),
    difficulty,
  };
}

function toRecord(item: {
  _id: unknown;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
  explanation?: string;
  topic: string;
  difficulty: string;
}): QuestionBankItemRecord {
  return {
    id: String(item._id),
    questionText: item.questionText,
    options: item.options,
    correctAnswerIndex: item.correctAnswerIndex,
    points: item.points,
    ...(item.explanation ? { explanation: item.explanation } : {}),
    topic: item.topic,
    difficulty: item.difficulty as QuestionBankItemRecord['difficulty'],
  };
}

export async function saveBankQuestion(teacherId: string, request: SaveBankQuestionRequest): Promise<QuestionBankItemRecord> {
  await connectDB();
  const created = await QuestionBankItem.create({ ...request, createdBy: new mongoose.Types.ObjectId(teacherId) });
  return toRecord(created);
}

/** The shared bank (all teachers see all questions), filtered by topic and/or difficulty. */
export async function listBankQuestions(filters: { topic?: string; difficulty?: string }): Promise<QuestionBankList> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.topic) query.topic = filters.topic.trim().toLowerCase();
  if (isDifficulty(filters.difficulty)) query.difficulty = filters.difficulty;
  const [items, topics] = await Promise.all([
    QuestionBankItem.find(query).sort({ createdAt: -1 }).limit(300).lean(),
    QuestionBankItem.distinct('topic'),
  ]);
  return { items: items.map(toRecord), topics: (topics as string[]).sort() };
}

export async function deleteBankQuestion(id: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(id)) return false;
  await connectDB();
  return (await QuestionBankItem.findByIdAndDelete(id)) !== null;
}
