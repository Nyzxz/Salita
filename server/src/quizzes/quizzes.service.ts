import mongoose from 'mongoose';
import type {
  ContentGrade,
  CreateQuizRequest,
  QuizStartRecord,
  QuizAttemptRecord,
  QuizContent,
  SubmitQuizAttemptRequest,
  User,
} from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { matchesGrade, parseContentGrade } from '../grades.js';
import { LIMITS } from '../limits.js';
import { QuizStart } from '../models/QuizStart.js';
import { Quiz, type IQuiz } from '../models/Quiz.js';
import { QuizAttempt, type IQuizAttempt } from '../models/QuizAttempt.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCreateQuizRequest(value: unknown): CreateQuizRequest | null {
  if (!isRecord(value)) return null;
  const { title, description, timeLimitMinutes, questions } = value;
  const gradeLevel = parseContentGrade(value.gradeLevel);
  if (
    gradeLevel === null ||
    typeof title !== 'string' ||
    !title.trim() ||
    typeof description !== 'string' ||
    !description.trim() ||
    title.trim().length > 160 ||
    description.trim().length > 2000 ||
    !Array.isArray(questions) ||
    questions.length < 1 ||
    questions.length > LIMITS.quizQuestions ||
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
      questionText.trim().length > LIMITS.question ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      options.some((option) => typeof option !== 'string' || !option.trim() || option.trim().length > LIMITS.option) ||
      !Number.isInteger(correctAnswerIndex) ||
      (correctAnswerIndex as number) < 0 ||
      (correctAnswerIndex as number) > 3 ||
      typeof points !== 'number' ||
      !Number.isInteger(points) ||
      points <= 0 ||
      points > LIMITS.points
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
    gradeLevel,
    ...(timeLimitMinutes === undefined ? {} : { timeLimitMinutes: timeLimitMinutes as number }),
    questions: parsedQuestions as CreateQuizRequest['questions'],
  };
}

export function parseSubmitQuizAttemptRequest(value: unknown): SubmitQuizAttemptRequest | null {
  if (!isRecord(value) || !Array.isArray(value.userAnswers)) return null;
  if (!value.userAnswers.every((answer) => Number.isInteger(answer) && answer >= -1 && answer <= 3)) {
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
    gradeLevel: (quiz.gradeLevel ?? 'ALL') as ContentGrade,
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

export async function listQuizzes(viewer?: User): Promise<QuizContent[]> {
  await connectDB();
  const quizzes = await Quiz.find().sort({ createdAt: -1 }).lean();
  const all = quizzes.map((quiz) => ({
    id: String(quiz._id),
    title: quiz.title,
    description: quiz.description,
    ...(quiz.timeLimitMinutes ? { timeLimitMinutes: quiz.timeLimitMinutes } : {}),
    gradeLevel: (quiz.gradeLevel ?? 'ALL') as ContentGrade,
    questions: quiz.questions.map(({ questionText, options, points }) => ({ questionText, options, points })),
    createdBy: String(quiz.createdBy),
    createdAt: quiz.createdAt.toISOString(),
  }));
  return viewer && viewer.role === 'STUDENT' ? all.filter((quiz) => matchesGrade(quiz.gradeLevel, viewer.section)) : all;
}

export type QuizResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Extra seconds allowed past the limit, covering network delay and clock rounding. */
const SUBMIT_GRACE_MS = 30_000;

/** Records when a student opens a quiz; for timed quizzes this starts the server-side clock. */
export async function startQuiz(user: User, quizId: string): Promise<QuizResult<QuizStartRecord>> {
  if (!mongoose.isValidObjectId(quizId)) return { ok: false, status: 404, error: 'Quiz not found.' };
  await connectDB();
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return { ok: false, status: 404, error: 'Quiz not found.' };
  if (!matchesGrade(quiz.gradeLevel, user.section)) {
    return { ok: false, status: 403, error: 'This quiz is not assigned to your grade level.' };
  }

  const startedAt = new Date();
  // Every (re)start resets the clock: a retake is a fresh attempt.
  await QuizStart.updateOne(
    { quizId: quiz._id, studentId: user.id },
    { $set: { startedAt } },
    { upsert: true },
  ).catch((error: unknown) => {
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
  });

  return {
    ok: true,
    data: {
      quizId: String(quiz._id),
      startedAt: startedAt.toISOString(),
      ...(quiz.timeLimitMinutes
        ? { expiresAt: new Date(startedAt.getTime() + quiz.timeLimitMinutes * 60_000).toISOString() }
        : {}),
    },
  };
}

export async function submitQuizAttempt(
  user: User,
  quizId: string,
  request: SubmitQuizAttemptRequest,
): Promise<QuizResult<QuizAttemptRecord>> {
  const invalid = { ok: false, status: 400, error: 'The quiz was not found or the answers do not match its questions.' } as const;
  if (!mongoose.isValidObjectId(quizId)) return invalid;
  await connectDB();
  const quiz = await Quiz.findById(quizId);
  if (!quiz || request.userAnswers.length !== quiz.questions.length) return invalid;
  if (request.userAnswers.some((answer, index) => answer >= quiz.questions[index].options.length)) return invalid;
  if (!matchesGrade(quiz.gradeLevel, user.section)) {
    return { ok: false, status: 403, error: 'This quiz is not assigned to your grade level.' };
  }

  if (quiz.timeLimitMinutes) {
    const start = await QuizStart.findOne({ quizId: quiz._id, studentId: user.id });
    if (!start) {
      return { ok: false, status: 400, error: 'Open the quiz from your quiz list before submitting it.' };
    }
    const deadline = start.startedAt.getTime() + quiz.timeLimitMinutes * 60_000 + SUBMIT_GRACE_MS;
    if (Date.now() > deadline) {
      await start.deleteOne();
      return { ok: false, status: 400, error: 'Time is up — this attempt was submitted after the time limit. Start the quiz again to retake it.' };
    }
  }

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
  // The attempt is done; the next one needs a fresh start.
  await QuizStart.deleteOne({ quizId: quiz._id, studentId: user.id });
  return { ok: true, data: toAttemptRecord(attempt) };
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