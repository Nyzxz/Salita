import type { Category } from '@shared/types';
import { fetchWords } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from './useAsync';

export function useWords(category?: Category) {
  const { session } = useAuth();
  const token = session?.token ?? '';
  return useAsync(() => fetchWords(token, category), [token, category]);
}
