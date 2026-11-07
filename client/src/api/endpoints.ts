import type { Category, LanguageMilestone, QuizQuestion, WordItem } from '@shared/types';
import { apiGet } from './client';

export function fetchWords(token: string, category?: Category): Promise<WordItem[]> {
  return apiGet<WordItem[]>('/api/words', category ? { category } : undefined, token);
}

export function fetchMilestones(token: string): Promise<LanguageMilestone[]> {
  return apiGet<LanguageMilestone[]>('/api/milestones', undefined, token);
}

export function fetchQuizQuestions(token: string, count?: number): Promise<QuizQuestion[]> {
  return apiGet<QuizQuestion[]>('/api/quiz', count ? { count: String(count) } : undefined, token);
}
