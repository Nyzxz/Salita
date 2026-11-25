import { Router } from 'express';
import type { ApiResponse, QuestionBankItemRecord, QuestionBankList, QuizAttemptRecord, QuizContent, QuizStartRecord, TeacherAnalytics, User } from '../../../shared/src/types.js';
import {
  createQuiz,
  deleteQuiz,
  getAllQuizAttempts,
  getTeacherAnalytics,
  grantRetakes,
  parseGrantRetakesRequest,
  updateQuiz,
  getStudentQuizAttempts,
  listQuizzes,
  parseCreateQuizRequest,
  parseSubmitQuizAttemptRequest,
  startQuiz,
  submitQuizAttempt,
} from '../quizzes/quizzes.service.js';
import { deleteBankQuestion, listBankQuestions, parseSaveBankQuestionRequest, saveBankQuestion } from '../quizzes/bank.service.js';
import { parsePageRequest, queryString } from '../pagination.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const quizzesRouter = Router();

// Question bank (teachers). Registered first so "bank" is never read as a quiz id.
quizzesRouter.get('/bank', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const body: ApiResponse<QuestionBankList> = {
      success: true,
      data: await listBankQuestions({ topic: queryString(req.query, 'topic'), difficulty: queryString(req.query, 'difficulty') }),
    };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.post('/bank', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseSaveBankQuestionRequest(req.body);
    if (!request) throw new ApiError(400, 'Give the question, four options, the correct one, points, a topic and a difficulty.');
    const body: ApiResponse<QuestionBankItemRecord> = { success: true, data: await saveBankQuestion((res.locals.user as User).id, request) };
    res.status(201).json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.delete('/bank/:id', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    if (!(await deleteBankQuestion(String(req.params.id)))) throw new ApiError(404, 'That question is no longer in the bank.');
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

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

quizzesRouter.get('/results', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const paging = parsePageRequest(req.query);
    const { items, total } = await getAllQuizAttempts({
      skip: paging.skip,
      limit: paging.limit,
      quizId: queryString(req.query, 'quizId', 40),
    });
    const body: ApiResponse<QuizAttemptRecord[]> = {
      success: true,
      data: items,
      meta: { total, page: paging.page, limit: paging.limit },
    };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.get('/analytics', requireAuth('TEACHER'), async (_req, res, next) => {
  try {
    const body: ApiResponse<TeacherAnalytics> = { success: true, data: await getTeacherAnalytics() };
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

quizzesRouter.post('/:quizId/retakes', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const studentIds = parseGrantRetakesRequest(req.body);
    if (!studentIds) throw new ApiError(400, 'Choose at least one student.');
    const result = await grantRetakes(req.params.quizId, studentIds);
    if (!result.ok) throw new ApiError(result.status, result.error);
    res.status(200).json({ success: true, data: result.data });
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

quizzesRouter.put('/:quizId', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const request = parseCreateQuizRequest(req.body);
    if (!request) throw new ApiError(400, 'Provide a title, description, and valid multiple-choice questions.');
    const result = await updateQuiz(req.params.quizId, request);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<QuizContent> = { success: true, data: result.data };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

quizzesRouter.delete('/:quizId', requireAuth('TEACHER'), async (req, res, next) => {
  try {
    const result = await deleteQuiz(req.params.quizId);
    if (!result.ok) throw new ApiError(result.status, result.error);
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});
