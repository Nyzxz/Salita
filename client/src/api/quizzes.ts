import type {
  CreateQuizRequest,
  PageMeta,
  QuizAttemptRecord,
  QuizContent,
  QuizStartRecord,
  SubmitQuizAttemptRequest,
  TeacherAnalytics,
  UpdateQuizRequest,
} from '@shared/types';
import { apiDelete, apiGet, apiGetPage, apiPost, apiPut } from './client';

export function fetchQuizzes(token?: string): Promise<QuizContent[]> {
  return apiGet<QuizContent[]>('/api/quizzes', undefined, token);
}

export function createQuiz(request: CreateQuizRequest, token?: string): Promise<QuizContent> {
  return apiPost<QuizContent>('/api/quizzes', request, token);
}

export function updateQuiz(id: string, request: UpdateQuizRequest): Promise<QuizContent> {
  return apiPut<QuizContent>(`/api/quizzes/${encodeURIComponent(id)}`, request);
}

export function deleteQuiz(id: string): Promise<{ id: string }> {
  return apiDelete<{ id: string }>(`/api/quizzes/${encodeURIComponent(id)}`);
}

export function startQuiz(quizId: string, token?: string): Promise<QuizStartRecord> {
  return apiPost<QuizStartRecord>(`/api/quizzes/${encodeURIComponent(quizId)}/start`, {}, token);
}

export function submitQuizAttempt(
  quizId: string,
  request: SubmitQuizAttemptRequest,
  token?: string,
): Promise<QuizAttemptRecord> {
  return apiPost<QuizAttemptRecord>(`/api/quizzes/${encodeURIComponent(quizId)}/submit`, request, token);
}

/** Teacher: let these students retake the quiz (each retake loses a random 1–5%). */
export function grantRetakes(quizId: string, studentIds: string[]): Promise<{ granted: number }> {
  return apiPost<{ granted: number }>(`/api/quizzes/${encodeURIComponent(quizId)}/retakes`, { studentIds });
}

export function fetchMyQuizAttempts(token?: string): Promise<QuizAttemptRecord[]> {
  return apiGet<QuizAttemptRecord[]>('/api/quizzes/attempts/me', undefined, token);
}

export async function fetchQuizResults(
  page = 1,
  limit = 50,
): Promise<{ items: QuizAttemptRecord[]; meta: PageMeta }> {
  const { data, meta } = await apiGetPage<QuizAttemptRecord[]>('/api/quizzes/results', {
    page: String(page),
    limit: String(limit),
  });
  return { items: data, meta: meta ?? { total: data.length, page: 1, limit: data.length } };
}

export function fetchTeacherAnalytics(): Promise<TeacherAnalytics> {
  return apiGet<TeacherAnalytics>('/api/quizzes/analytics');
}
