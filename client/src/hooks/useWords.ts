import type { Category } from '@shared/types';
import { fetchWords } from '../api/endpoints';
import { useAsync } from './useAsync';

export function useWords(category?: Category) {
  return useAsync(() => fetchWords(category), [category]);
}
