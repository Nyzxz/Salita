import type { Category, LanguageMilestone, QuizQuestion, WordItem } from '@shared/types';
import { apiGet } from './client';

export function fetchWords(category?: Category): Promise<WordItem[]> {
  return apiGet<WordItem[]>('/api/words', category ? { category } : undefined);
}

export function fetchMilestones(): Promise<LanguageMilestone[]> {
  return apiGet<LanguageMilestone[]>('/api/milestones');
}

export function fetchQuizQuestions(count?: number): Promise<QuizQuestion[]> {
  return apiGet<QuizQuestion[]>('/api/quiz', count ? { count: String(count) } : undefined);
}
