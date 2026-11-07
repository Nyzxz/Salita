import { useCallback, useState } from 'react';
import { fetchQuizQuestions } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from './useAsync';

export function useQuiz(count = 8) {
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [round, setRound] = useState(0);
  const state = useAsync(() => fetchQuizQuestions(token, count), [token, count, round]);
  const reload = useCallback(() => setRound((r) => r + 1), []);

  return { ...state, reload };
}
