import mongoose from 'mongoose';
import type {
  CreateQuizRequest,
  QuizAttemptRecord,
  QuizContent,
  SubmitQuizAttemptRequest,
  User,
} from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { Quiz, type IQuiz } from '../models/Quiz.js';
import { QuizAttempt, type IQuizAttempt } from '../models/QuizAttempt.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCreateQuizRequest(value: unknown): CreateQuizRequest | null {
  if (!isRecord(value)) return null;
  const { title, description, timeLimitMinutes, questions } = value;
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof description !== 'string' ||
    !description.trim() ||
    !Array.isArray(questions) ||
    questions.length < 1 ||
    (timeLimitMinutes !== undefined &&
      (!Number.isInteger(timeLimitMinutes) || (timeLimitMinutes as number) < 1 || (timeLimitMinutes as number) > 600))
  ) {
    return null;
  }

  const parsedQuestions = questions.map((question) => {
    if (!isRecord(question)) return null;
    const { questionText, options, correctAnswerIndex, points } = question;
    if (
      typeof questionText !== 'string' ||
      !questionText.trim() ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some((option) => typeof option !== 'string' || !option.trim()) ||
      !Number.isInteger(correctAnswerIndex) ||
      (correctAnswerIndex as number) < 0 ||
      (correctAnswerIndex as number) > 3 ||
      typeof points !== 'number' ||
      !Number.isFinite(points) ||
      points <= 0
    ) {
      return null;
    }
    return {
      questionText: questionText.trim(),
      options: options.map((option: string) => option.trim()),
      correctAnswerIndex: correctAnswerIndex as number,
      points,
    };
  });
  if (parsedQuestions.some((question) => question === null)) return null;

  return {
    title: title.trim(),
    description: description.trim(),
    ...(timeLimitMinutes === undefined ? {} : { timeLimitMinutes: timeLimitMinutes as number }),
    questions: parsedQuestions as CreateQuizRequest['questions'],
  };
}

export function parseSubmitQuizAttemptRequest(value: unknown): SubmitQuizAttemptRequest | null {
  if (!isRecord(value) || !Array.isArray(value.userAnswers)) return null;
  if (!value.userAnswers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3)) {
    return null;
  }
  return { userAnswers: value.userAnswers as number[] };
}

function toQuizContent(quiz: IQuiz): QuizContent {
  return {
    id: String(quiz._id),
    title: quiz.title,
    description: quiz.description,
    ...(quiz.timeLimitMinutes ? { timeLimitMinutes: quiz.timeLimitMinutes } : {}),
    questions: quiz.questions.map(({ questionText, options, points }) => ({ questionText, options, points })),
    createdBy: String(quiz.createdBy),
    createdAt: quiz.createdAt.toISOString(),
  };
}

function toAttemptRecord(attempt: IQuizAttempt): QuizAttemptRecord {
  return {
    id: String(attempt._id),
    quizId: String(attempt.quizId),
    quizTitle: attempt.quizTitle,
    studentId: String(attempt.studentId),
    studentName: attempt.studentName,
    userAnswers: attempt.userAnswers,
    scoreObtained: attempt.scoreObtained,
    totalPossiblePoints: attempt.totalPossiblePoints,
    percentageScore: attempt.percentageScore,
    feedback: attempt.feedback,
    completedAt: attempt.completedAt.toISOString(),
  };
}

export async function createQuiz(user: User, request: CreateQuizRequest): Promise<QuizContent> {
  await connectDB();
  const quiz = await Quiz.create({ ...request, createdBy: new mongoose.Types.ObjectId(user.id) });
  return toQuizContent(quiz);
}

export async function listQuizzes(): Promise<QuizContent[]> {
  await connectDB();
  const quizzes = await Quiz.find().sort({ createdAt: -1 }).lean();
  return quizzes.map((quiz) => ({
    id: String(quiz._id),
    title: quiz.title,
    description: quiz.description,
    ...(quiz.timeLimitMinutes ? { timeLimitMinutes: quiz.timeLimitMinutes } : {}),
    questions: quiz.questions.map(({ questionText, options, points }) => ({ questionText, options, points })),
    createdBy: String(quiz.createdBy),
    createdAt: quiz.createdAt.toISOString(),
  }));
}

export async function submitQuizAttempt(
  user: User,
  quizId: string,
  request: SubmitQuizAttemptRequest,
): Promise<QuizAttemptRecord | null> {
  if (!mongoose.isValidObjectId(quizId)) return null;
  await connectDB();
  const quiz = await Quiz.findById(quizId);
  if (!quiz || request.userAnswers.length !== quiz.questions.length) return null;
  if (request.userAnswers.some((answer, index) => answer >= quiz.questions[index].options.length)) return null;

  const totalPossiblePoints = quiz.questions.reduce((sum, question) => sum + question.points, 0);
  const scoreObtained = quiz.questions.reduce(
    (sum, question, index) => sum + (request.userAnswers[index] === question.correctAnswerIndex ? question.points : 0),
    0,
  );
  const percentageScore = Math.round((scoreObtained / totalPossiblePoints) * 10000) / 100;
  const feedback =
    percentageScore >= 90
      ? 'Excellent work. You have a strong grasp of this material.'
      : percentageScore >= 70
        ? 'Good progress. Review any missed questions and keep practicing.'
        : 'Keep practicing. Review the lesson material and try again.';
  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    quizTitle: quiz.title,
    studentId: new mongoose.Types.ObjectId(user.id),
    studentName: user.name,
    userAnswers: request.userAnswers,
    scoreObtained,
    totalPossiblePoints,
    percentageScore,
    feedback,
  });
  return toAttemptRecord(attempt);
}

export async function getStudentQuizAttempts(studentId: string): Promise<QuizAttemptRecord[]> {
  await connectDB();
  const attempts = await QuizAttempt.find({ studentId }).sort({ completedAt: -1 }).lean();
  return attempts.map((attempt) => ({
    id: String(attempt._id),
    quizId: String(attempt.quizId),
    quizTitle: attempt.quizTitle,
    studentId: String(attempt.studentId),
    studentName: attempt.studentName,
    userAnswers: attempt.userAnswers,
    scoreObtained: attempt.scoreObtained,
    totalPossiblePoints: attempt.totalPossiblePoints,
    percentageScore: attempt.percentageScore,
    feedback: attempt.feedback,
    completedAt: attempt.completedAt.toISOString(),
  }));
}

export async function getAllQuizAttempts(): Promise<QuizAttemptRecord[]> {
  await connectDB();
  const attempts = await QuizAttempt.find().sort({ completedAt: -1 }).lean();
  return attempts.map((attempt) => ({
    id: String(attempt._id),
    quizId: String(attempt.quizId),
    quizTitle: attempt.quizTitle,
    studentId: String(attempt.studentId),
    studentName: attempt.studentName,
    userAnswers: attempt.userAnswers,
    scoreObtained: attempt.scoreObtained,
    totalPossiblePoints: attempt.totalPossiblePoints,
    percentageScore: attempt.percentageScore,
    feedback: attempt.feedback,
    completedAt: attempt.completedAt.toISOString(),
  }));
}