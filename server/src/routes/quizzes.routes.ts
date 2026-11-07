import { Router } from 'express';
import type { ApiResponse, QuizAttemptRecord, QuizContent, QuizStartRecord, User } from '../../../shared/src/types.js';
import {
  createQuiz,
  getAllQuizAttempts,
  getStudentQuizAttempts,
  listQuizzes,
  parseCreateQuizRequest,
  parseSubmitQuizAttemptRequest,
  startQuiz,
  submitQuizAttempt,
} from '../quizzes/quizzes.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const quizzesRouter = Router();

quizzesRouter.get('/', requireAuth(), async (_req, res, next) => {
  try {
    const body: ApiResponse<QuizContent[]> = { success: true, data: await listQuizzes(res.locals.user as User) };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.post('/', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseCreateQuizRequest(req.body);
    if (!request) throw new ApiError(400, 'Provide a title, description, and valid multiple-choice questions.');
    const user = res.locals.user as User;
    const body: ApiResponse<QuizContent> = { success: true, data: await createQuiz(user, request) };
    res.status(201).json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.get('/attempts/me', requireAuth('STUDENT'), async (_req, res, next) => {
  try {
    const user = res.locals.user as User;
    const body: ApiResponse<QuizAttemptRecord[]> = {
      success: true,
      data: await getStudentQuizAttempts(user.id),
    };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.get('/results', requireAuth('TEACHER'), async (_req, res, next) => {
  try {
    const body: ApiResponse<QuizAttemptRecord[]> = { success: true, data: await getAllQuizAttempts() };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.post('/:quizId/start', requireAuth('STUDENT'), async (req, res, next) => {
  try {
    const result = await startQuiz(res.locals.user as User, req.params.quizId);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<QuizStartRecord> = { success: true, data: result.data };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.post('/:quizId/submit', requireAuth('STUDENT'), async (req, res, next) => {
  try {
    const request = parseSubmitQuizAttemptRequest(req.body);
    if (!request) throw new ApiError(400, 'Submit one selected answer for each question.');
    const user = res.locals.user as User;
    const result = await submitQuizAttempt(user, req.params.quizId, request);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<QuizAttemptRecord> = { success: true, data: result.data };
    res.status(201).json(body);
  } catch (error) {
    next(error);
  }
});