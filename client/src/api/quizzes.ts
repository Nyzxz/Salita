import type {
  CreateQuizRequest,
  QuizAttemptRecord,
  QuizContent,
  SubmitQuizAttemptRequest,
} from '@shared/types';
import { apiGet, apiPost } from './client';

export function fetchQuizzes(token: string): Promise<QuizContent[]> {
  return apiGet<QuizContent[]>('/api/quizzes', undefined, token);
}

export function createQuiz(request: CreateQuizRequest, token: string): Promise<QuizContent> {
  return apiPost<QuizContent>('/api/quizzes', request, token);
}

export function submitQuizAttempt(
  quizId: string,
  request: SubmitQuizAttemptRequest,
  token: string,
): Promise<QuizAttemptRecord> {
  return apiPost<QuizAttemptRecord>(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, request, token);
}

export function fetchMyQuizAttempts(token: string): Promise<QuizAttemptRecord[]> {
  return apiGet<QuizAttemptRecord[]>('/api/quizzes/attempts/me', undefined, token);
}

export function fetchQuizResults(token: string): Promise<QuizAttemptRecord[]> {
  return apiGet<QuizAttemptRecord[]>('/api/quizzes/results', undefined, token);
}