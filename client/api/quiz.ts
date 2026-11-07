import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResponse, QuizAttemptRecord, QuizContent, QuizQuestion, QuizStartRecord, User } from '../../shared/src/types.js';
import { QUIZ_QUESTIONS } from '../../server/src/data/quiz.data.js';
import { getUserFromAuthHeader } from '../../server/src/auth/auth.service.js';
import {
  createQuiz,
  getAllQuizAttempts,
  getStudentQuizAttempts,
  listQuizzes,
  parseCreateQuizRequest,
  parseSubmitQuizAttemptRequest,
  startQuiz,
  submitQuizAttempt,
} from '../../server/src/quizzes/quizzes.service.js';

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sendError(res: VercelResponse, status: number, error: string): void {
  res.status(status).json({ success: false, data: null, error });
}

function queryPath(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join('/') : value ?? '';
}

async function handleSavedQuizApi(req: VercelRequest, res: VercelResponse): Promise<void> {
  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) {
    sendError(res, 401, 'You need to sign in to do that.');
    return;
  }

  const path = queryPath(req.query.path).replace(/^\/+|\/+$/g, '');
  if (!path && req.method === 'GET') {
    const body: ApiResponse<QuizContent[]> = { success: true, data: await listQuizzes(user as User) };
    res.status(200).json(body);
    return;
  }
  if (!path && req.method === 'POST') {
    if (user.role !== 'TEACHER') {
      sendError(res, 403, 'Your account is not allowed to do that.');
      return;
    }
    const request = parseCreateQuizRequest(req.body);
    if (!request) {
      sendError(res, 400, 'Provide a title, description, and valid multiple-choice questions.');
      return;
    }
    const body: ApiResponse<QuizContent> = { success: true, data: await createQuiz(user as User, request) };
    res.status(201).json(body);
    return;
  }
  if (path === 'results' && req.method === 'GET') {
    if (user.role !== 'TEACHER') {
      sendError(res, 403, 'Your account is not allowed to do that.');
      return;
    }
    const body: ApiResponse<QuizAttemptRecord[]> = { success: true, data: await getAllQuizAttempts() };
    res.status(200).json(body);
    return;
  }
  if (path === 'attempts/me' && req.method === 'GET') {
    if (user.role !== 'STUDENT') {
      sendError(res, 403, 'Your account is not allowed to do that.');
      return;
    }
    const body: ApiResponse<QuizAttemptRecord[]> = { success: true, data: await getStudentQuizAttempts(user.id) };
    res.status(200).json(body);
    return;
  }

  const startMatch = path.match(/^([^/]+)\/start$/);
  if (startMatch && req.method === 'POST') {
    if (user.role !== 'STUDENT') {
      sendError(res, 403, 'Your account is not allowed to do that.');
      return;
    }
    const started = await startQuiz(user, startMatch[1]);
    if (!started.ok) {
      sendError(res, started.status, started.error);
      return;
    }
    const body: ApiResponse<QuizStartRecord> = { success: true, data: started.data };
    res.status(200).json(body);
    return;
  }

  const submitMatch = path.match(/^([^/]+)\/submit$/);
  if (submitMatch && req.method === 'POST') {
    if (user.role !== 'STUDENT') {
      sendError(res, 403, 'Your account is not allowed to do that.');
      return;
    }
    const request = parseSubmitQuizAttemptRequest(req.body);
    if (!request) {
      sendError(res, 400, 'Submit one selected answer for each question.');
      return;
    }
    const result = await submitQuizAttempt(user, submitMatch[1], request);
    if (!result.ok) {
      sendError(res, result.status, result.error);
      return;
    }
    const body: ApiResponse<QuizAttemptRecord> = { success: true, data: result.data };
    res.status(201).json(body);
    return;
  }

  sendError(res, 404, 'No quiz endpoint matches this request.');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.query.resource === 'quizzes') {
    await handleSavedQuizApi(req, res);
    return;
  }

  const practiceUser = await getUserFromAuthHeader(req.headers.authorization);
  if (!practiceUser) {
    sendError(res, 401, 'You need to sign in to do that.');
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(res, 405, `Method ${req.method} not allowed.`);
    return;
  }

  const { count } = req.query;

  if (count === undefined) {
    const body: ApiResponse<QuizQuestion[]> = { success: true, data: QUIZ_QUESTIONS };
    res.status(200).json(body);
    return;
  }

  const parsed = Number(count);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: `"count" must be a positive integer, received "${String(count)}".`,
    };
    res.status(400).json(body);
    return;
  }

  const data = shuffled(QUIZ_QUESTIONS).slice(0, Math.min(parsed, QUIZ_QUESTIONS.length));
  const body: ApiResponse<QuizQuestion[]> = { success: true, data };
  res.status(200).json(body);
}
