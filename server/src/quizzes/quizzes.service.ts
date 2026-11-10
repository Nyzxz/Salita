import mongoose from 'mongoose';
import type {
  ContentGrade,
  CreateQuizRequest,
  QuizAnalyticsItem,
  QuizReviewItem,
  QuizStartRecord,
  StudentProgressItem,
  TeacherAnalytics,
  UpdateQuizRequest,
  QuizAttemptRecord,
  QuizContent,
  SubmitQuizAttemptRequest,
  User,
} from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { matchesGrade, parseContentGrade } from '../grades.js';
import { LIMITS } from '../limits.js';
import { notifyStudentsOfGrade, notifyUsers } from '../notifications/notifications.service.js';
import { QuizRetake } from '../models/QuizRetake.js';
import { QuizStart } from '../models/QuizStart.js';
import { Submission } from '../models/Submission.js';
import { User as UserModel } from '../models/User.js';
import { findActivityTask } from '../content/content.service.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt, type IQuizAttempt } from '../models/QuizAttempt.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCreateQuizRequest(value: unknown): CreateQuizRequest | null {
  if (!isRecord(value)) return null;
  const { title, description, timeLimitMinutes, questions, dueDate, randomize } = value;
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
      (!Number.isInteger(timeLimitMinutes) || (timeLimitMinutes as number) < 1 || (timeLimitMinutes as number) > 600)) ||
    (dueDate !== undefined && dueDate !== null && (typeof dueDate !== 'string' || !Number.isFinite(Date.parse(dueDate)))) ||
    (randomize !== undefined && typeof randomize !== 'boolean')
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
    ...(typeof dueDate === 'string' ? { dueDate } : {}),
    randomize: randomize === true,
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

function toQuizContent(
  quiz: {
  _id: unknown;
  title: string;
  description: string;
  timeLimitMinutes?: number | null;
  dueDate?: Date | null;
  randomize?: boolean;
  gradeLevel?: string;
  questions: Array<{ questionText: string; options: string[]; points: number; correctAnswerIndex?: number }>;
  createdBy: unknown;
  createdAt: Date;
  },
  withAnswers = false,
): QuizContent {
  return {
    id: String(quiz._id),
    title: quiz.title,
    description: quiz.description,
    ...(quiz.timeLimitMinutes ? { timeLimitMinutes: quiz.timeLimitMinutes } : {}),
    ...(quiz.dueDate ? { dueDate: quiz.dueDate.toISOString() } : {}),
    randomize: quiz.randomize === true,
    gradeLevel: (quiz.gradeLevel ?? 'ALL') as ContentGrade,
    // Correct answers are deliberately left out of what students receive.
    questions: quiz.questions.map(({ questionText, options, points, correctAnswerIndex }) => ({
      questionText,
      options,
      points,
      ...(withAnswers && correctAnswerIndex !== undefined ? { correctAnswerIndex } : {}),
    })),
    createdBy: String(quiz.createdBy),
    createdAt: quiz.createdAt.toISOString(),
  };
}

type AttemptLike = Pick<
  IQuizAttempt,
  | 'quizTitle'
  | 'studentName'
  | 'userAnswers'
  | 'scoreObtained'
  | 'totalPossiblePoints'
  | 'percentageScore'
  | 'feedback'
  | 'completedAt'
  | 'questions'
  | 'reviewable'
> & { _id: unknown; quizId: unknown; studentId: unknown; penaltyPercent?: number | null };

/** Builds the per-question review a student sees after finishing, from the snapshot saved with the attempt. */
export function buildReview(
  questions: ReadonlyArray<{ questionText: string; options: string[]; correctAnswerIndex: number; points: number }>,
  userAnswers: readonly number[],
): QuizReviewItem[] {
  return questions.map((question, index) => {
    const userAnswer = userAnswers[index] ?? -1;
    return {
      questionText: question.questionText,
      options: question.options,
      correctAnswerIndex: question.correctAnswerIndex,
      userAnswer,
      points: question.points,
      earned: userAnswer === question.correctAnswerIndex ? question.points : 0,
    };
  });
}

function toAttemptRecord(attempt: AttemptLike, options: { includeReview: boolean }): QuizAttemptRecord {
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
    ...(attempt.penaltyPercent ? { penaltyPercent: attempt.penaltyPercent } : {}),
    ...(options.includeReview && attempt.reviewable && attempt.questions?.length
      ? { review: buildReview(attempt.questions, attempt.userAnswers) }
      : {}),
  };
}

/** A retake loses a random 1–5 percentage points. Injectable so tests can pin it. */
export function randomRetakePenalty(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 5);
}

/**
 * Scores answers against the questions. An unanswered question (-1) earns nothing.
 * `penaltyPercent` (used for retakes) comes off the percentage, never below zero.
 */
export function scoreAnswers(
  questions: ReadonlyArray<{ correctAnswerIndex: number; points: number }>,
  userAnswers: readonly number[],
  penaltyPercent = 0,
): { scoreObtained: number; totalPossiblePoints: number; percentageScore: number; feedback: string } {
  const totalPossiblePoints = questions.reduce((sum, question) => sum + question.points, 0);
  const scoreObtained = questions.reduce(
    (sum, question, index) => sum + (userAnswers[index] === question.correctAnswerIndex ? question.points : 0),
    0,
  );
  const raw = totalPossiblePoints === 0 ? 0 : (scoreObtained / totalPossiblePoints) * 100;
  const percentageScore = Math.round(Math.max(0, raw - penaltyPercent) * 100) / 100;
  const feedback =
    percentageScore >= 90
      ? 'Excellent work. You have a strong grasp of this material.'
      : percentageScore >= 70
        ? 'Good progress. Review any missed questions and keep practicing.'
        : 'Keep practicing. Review the lesson material and try again.';
  return { scoreObtained, totalPossiblePoints, percentageScore, feedback };
}

function quizFields(request: CreateQuizRequest) {
  return {
    title: request.title,
    description: request.description,
    gradeLevel: request.gradeLevel,
    timeLimitMinutes: request.timeLimitMinutes ?? null,
    dueDate: request.dueDate ? new Date(request.dueDate) : null,
    randomize: request.randomize === true,
    questions: request.questions,
  };
}

export async function createQuiz(user: User, request: CreateQuizRequest): Promise<QuizContent> {
  await connectDB();
  const quiz = await Quiz.create({ ...quizFields(request), createdBy: new mongoose.Types.ObjectId(user.id) });
  await notifyStudentsOfGrade(request.gradeLevel, {
    title: 'New quiz',
    body: request.title,
    link: '/dashboard/student#quizzes',
  });
  return toQuizContent(quiz);
}

export async function listQuizzes(viewer?: User): Promise<QuizContent[]> {
  await connectDB();
  const quizzes = await Quiz.find().sort({ createdAt: -1 }).limit(500).lean();
  const all = quizzes.map((quiz) => toQuizContent(quiz, viewer?.role === 'TEACHER'));
  if (!viewer || viewer.role !== 'STUDENT') return all;

  const mine = all.filter((quiz) => matchesGrade(quiz.gradeLevel, viewer.section));
  const grants = await QuizRetake.find({ studentId: viewer.id }).select('quizId').lean();
  const open = new Set(grants.map((grant) => String(grant.quizId)));
  return mine.map((quiz) => (open.has(quiz.id) ? { ...quiz, retakeOpen: true } : quiz));
}

export type QuizResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function updateQuiz(id: string, request: UpdateQuizRequest): Promise<QuizResult<QuizContent>> {
  if (!mongoose.isValidObjectId(id)) return { ok: false, status: 404, error: 'Quiz not found.' };
  await connectDB();
  const quiz = await Quiz.findByIdAndUpdate(id, { $set: quizFields(request) }, { new: true, runValidators: true });
  if (!quiz) return { ok: false, status: 404, error: 'Quiz not found.' };
  return { ok: true, data: toQuizContent(quiz) };
}

/** Deleting a quiz also removes its results and any in-progress starts. */
export async function deleteQuiz(id: string): Promise<QuizResult<{ id: string }>> {
  if (!mongoose.isValidObjectId(id)) return { ok: false, status: 404, error: 'Quiz not found.' };
  await connectDB();
  const deleted = await Quiz.findByIdAndDelete(id);
  if (!deleted) return { ok: false, status: 404, error: 'Quiz not found.' };
  await Promise.all([
    QuizAttempt.deleteMany({ quizId: deleted._id }),
    QuizStart.deleteMany({ quizId: deleted._id }),
    QuizRetake.deleteMany({ quizId: deleted._id }),
  ]);
  return { ok: true, data: { id } };
}
/** Extra seconds allowed past the limit, covering network delay and clock rounding. */
const SUBMIT_GRACE_MS = 30_000;

/** Why a student may not open or submit this quiz right now, or null if they may. */
async function whyBlocked(
  quiz: { _id: unknown; dueDate?: Date | null; gradeLevel?: string },
  user: User,
  options: { checkDue: boolean; dueGraceMs?: number },
): Promise<{ status: number; error: string } | null> {
  if (!matchesGrade(quiz.gradeLevel ?? 'ALL', user.section)) {
    return { status: 403, error: 'This quiz is not assigned to your grade level.' };
  }
  if (options.checkDue && quiz.dueDate && Date.now() > quiz.dueDate.getTime() + (options.dueGraceMs ?? 0)) {
    return { status: 400, error: 'This quiz is closed — its due date has passed.' };
  }
  return null;
}

/**
 * Opens a quiz and starts the server-side clock. Everyone gets one attempt; a second
 * one only exists when the teacher has unlocked a retake for that student.
 */
export async function startQuiz(user: User, quizId: string): Promise<QuizResult<QuizStartRecord>> {
  if (!mongoose.isValidObjectId(quizId)) return { ok: false, status: 404, error: 'Quiz not found.' };
  await connectDB();
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return { ok: false, status: 404, error: 'Quiz not found.' };
  const blocked = await whyBlocked(quiz, user, { checkDue: true });
  if (blocked) return { ok: false, ...blocked };

  const alreadyTook = await QuizAttempt.exists({ quizId: quiz._id, studentId: user.id });
  if (alreadyTook && !(await QuizRetake.exists({ quizId: quiz._id, studentId: user.id }))) {
    return { ok: false, status: 400, error: 'You have already taken this quiz. Ask your teacher if you need a retake.' };
  }

  const startedAt = new Date();
  // Every (re)start resets the clock.
  await QuizStart.updateOne({ quizId: quiz._id, studentId: user.id }, { $set: { startedAt } }, { upsert: true }).catch(
    (error: unknown) => {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
    },
  );

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
  const blocked = await whyBlocked(quiz, user, { checkDue: true, dueGraceMs: SUBMIT_GRACE_MS });
  if (blocked) return { ok: false, ...blocked };

  // Consuming the start record is atomic, so two simultaneous submits can't both count.
  const start = await QuizStart.findOneAndDelete({ quizId: quiz._id, studentId: user.id });
  if (!start) {
    return { ok: false, status: 400, error: 'Open the quiz from your quiz list before submitting it.' };
  }
  if (quiz.timeLimitMinutes && Date.now() > start.startedAt.getTime() + quiz.timeLimitMinutes * 60_000 + SUBMIT_GRACE_MS) {
    return { ok: false, status: 400, error: 'Time is up — this attempt was submitted after the time limit.' };
  }

  // A second attempt needs an unlocked retake, which is used up here (also atomic).
  const isRetake = (await QuizAttempt.exists({ quizId: quiz._id, studentId: user.id })) !== null;
  let penaltyPercent = 0;
  if (isRetake) {
    const grant = await QuizRetake.findOneAndDelete({ quizId: quiz._id, studentId: user.id });
    if (!grant) {
      return { ok: false, status: 400, error: 'You have already taken this quiz. Ask your teacher if you need a retake.' };
    }
    penaltyPercent = randomRetakePenalty();
  }

  const { scoreObtained, totalPossiblePoints, percentageScore, feedback } = scoreAnswers(
    quiz.questions,
    request.userAnswers,
    penaltyPercent,
  );
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
    questions: quiz.questions.map(({ questionText, options, correctAnswerIndex, points }) => ({
      questionText,
      options,
      correctAnswerIndex,
      points,
    })),
    // Students always see where they went wrong once they are done.
    reviewable: true,
    ...(penaltyPercent ? { penaltyPercent } : {}),
  });
  return { ok: true, data: toAttemptRecord(attempt, { includeReview: true }) };
}

export function parseGrantRetakesRequest(value: unknown): string[] | null {
  if (!isRecord(value)) return null;
  const { studentIds } = value;
  if (
    !Array.isArray(studentIds) ||
    studentIds.length < 1 ||
    studentIds.length > 200 ||
    !studentIds.every((id) => typeof id === 'string' && mongoose.isValidObjectId(id))
  ) return null;
  return [...new Set(studentIds as string[])];
}

/** Unlocks one more attempt on a quiz for each listed student who has already taken it. */
export async function grantRetakes(quizId: string, studentIds: string[]): Promise<QuizResult<{ granted: number }>> {
  if (!mongoose.isValidObjectId(quizId)) return { ok: false, status: 404, error: 'Quiz not found.' };
  await connectDB();
  const quiz = await Quiz.findById(quizId).select('_id title');
  if (!quiz) return { ok: false, status: 404, error: 'Quiz not found.' };

  // Only students who actually took it can need a retake.
  const took = await QuizAttempt.distinct('studentId', { quizId: quiz._id, studentId: { $in: studentIds } });
  if (took.length === 0) return { ok: false, status: 400, error: 'None of those students have taken this quiz yet.' };

  await Promise.all(
    took.map((studentId) =>
      QuizRetake.updateOne({ quizId: quiz._id, studentId }, { $setOnInsert: { grantedAt: new Date() } }, { upsert: true }).catch(
        (error: unknown) => {
          if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error;
        },
      ),
    ),
  );
  await notifyUsers(took.map(String), {
    title: 'Retake unlocked',
    body: `Your teacher opened a retake for “${quiz.title}”. Your score will be reduced by 1–5%.`,
    link: '/dashboard/student#quizzes',
  });
  return { ok: true, data: { granted: took.length } };
}

/** A student's own attempts, newest first, with answer review where the quiz allows it. */
export async function getStudentQuizAttempts(studentId: string): Promise<QuizAttemptRecord[]> {
  await connectDB();
  const attempts = await QuizAttempt.find({ studentId }).sort({ completedAt: -1 }).limit(200).lean();
  return attempts.map((attempt) => toAttemptRecord(attempt as unknown as AttemptLike, { includeReview: true }));
}

export interface AttemptPage {
  items: QuizAttemptRecord[];
  total: number;
}

/** The teacher's results list: paginated, without answer review. */
export async function getAllQuizAttempts(options: { skip?: number; limit?: number; quizId?: string } = {}): Promise<AttemptPage> {
  await connectDB();
  const filter = options.quizId && mongoose.isValidObjectId(options.quizId) ? { quizId: options.quizId } : {};
  const [attempts, total] = await Promise.all([
    QuizAttempt.find(filter)
      .sort({ completedAt: -1 })
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 50)
      .select('-questions')
      .lean(),
    QuizAttempt.countDocuments(filter),
  ]);
  const grants = await QuizRetake.find({
    quizId: { $in: [...new Set(attempts.map((attempt) => String(attempt.quizId)))] },
    studentId: { $in: [...new Set(attempts.map((attempt) => String(attempt.studentId)))] },
  })
    .select('quizId studentId')
    .lean();
  const open = new Set(grants.map((grant) => `${String(grant.quizId)}:${String(grant.studentId)}`));
  return {
    total,
    items: attempts.map((attempt) => ({
      ...toAttemptRecord({ ...attempt, questions: [] } as unknown as AttemptLike, { includeReview: false }),
      ...(open.has(`${String(attempt.quizId)}:${String(attempt.studentId)}`) ? { retakeOpen: true } : {}),
    })),
  };
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Class-level results: per-quiz averages with question-by-question item analysis, and per-student progress. */
export async function getTeacherAnalytics(): Promise<TeacherAnalytics> {
  await connectDB();
  const [attempts, students, graded] = await Promise.all([
    QuizAttempt.find().sort({ completedAt: -1 }).limit(5000).lean(),
    UserModel.find({ role: 'STUDENT' }).select('fullName section').limit(2000).lean(),
    Submission.find({ status: 'GRADED' }).select('taskId studentId grade').limit(10000).lean(),
  ]);

  // --- per quiz
  const byQuiz = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const key = String(attempt.quizId);
    byQuiz.set(key, [...(byQuiz.get(key) ?? []), attempt]);
  }
  const quizzes: QuizAnalyticsItem[] = [];
  for (const [quizId, group] of byQuiz) {
    const percents = group.map((attempt) => attempt.percentageScore);
    // Item analysis uses the newest snapshot, and only attempts taken against the same number of questions.
    const reference = group.find((attempt) => attempt.questions?.length)?.questions ?? [];
    const comparable = group.filter((attempt) => attempt.questions?.length === reference.length);
    quizzes.push({
      quizId,
      title: group[0].quizTitle,
      gradeLevel: 'ALL',
      attempts: group.length,
      students: new Set(group.map((attempt) => String(attempt.studentId))).size,
      averagePercent: round1(percents.reduce((sum, value) => sum + value, 0) / percents.length),
      highestPercent: Math.max(...percents),
      lowestPercent: Math.min(...percents),
      questions: reference.map((question, index) => {
        const optionCounts = [0, 0, 0, 0];
        let unanswered = 0;
        let correct = 0;
        for (const attempt of comparable) {
          const answer = attempt.userAnswers[index] ?? -1;
          if (answer < 0 || answer > 3) unanswered += 1;
          else optionCounts[answer] += 1;
          if (answer === question.correctAnswerIndex) correct += 1;
        }
        return {
          questionText: question.questionText,
          correctRate: comparable.length ? round1((correct / comparable.length) * 100) : 0,
          optionCounts,
          correctAnswerIndex: question.correctAnswerIndex,
          unanswered,
        };
      }),
    });
  }
  const quizMeta = await Quiz.find({ _id: { $in: [...byQuiz.keys()] } }).select('gradeLevel').lean();
  const gradeByQuiz = new Map(quizMeta.map((quiz) => [String(quiz._id), quiz.gradeLevel ?? 'ALL']));
  for (const item of quizzes) item.gradeLevel = gradeByQuiz.get(item.quizId) ?? 'ALL';
  quizzes.sort((a, b) => a.averagePercent - b.averagePercent);

  // --- per student
  const totals = new Map<string, number>();
  for (const taskId of new Set(graded.map((submission) => submission.taskId))) {
    const task = await findActivityTask(taskId);
    if (task) totals.set(taskId, task.totalPoints);
  }
  const progress: StudentProgressItem[] = students.map((student) => {
    const id = String(student._id);
    const mine = attempts.filter((attempt) => String(attempt.studentId) === id);
    const work = graded.filter((submission) => String(submission.studentId) === id && totals.has(submission.taskId) && submission.grade !== undefined);
    return {
      studentId: id,
      studentName: student.fullName,
      section: student.section ?? '',
      quizzesTaken: new Set(mine.map((attempt) => String(attempt.quizId))).size,
      quizAveragePercent: mine.length ? round1(mine.reduce((sum, attempt) => sum + attempt.percentageScore, 0) / mine.length) : null,
      tasksGraded: work.length,
      taskAveragePercent: work.length
        ? round1(work.reduce((sum, submission) => sum + ((submission.grade ?? 0) / (totals.get(submission.taskId) ?? 1)) * 100, 0) / work.length)
        : null,
    };
  });
  progress.sort((a, b) => a.studentName.localeCompare(b.studentName));

  return { quizzes, students: progress };
}
