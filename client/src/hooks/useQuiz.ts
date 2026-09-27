import { useCallback, useState } from 'react';
import { fetchQuizQuestions } from '../api/endpoints';
import { useAsync } from './useAsync';

export function useQuiz(count = 8) {
  const [round, setRound] = useState(0);
  const state = useAsync(() => fetchQuizQuestions(count), [count, round]);
  const reload = useCallback(() => setRound((r) => r + 1), []);

  return { ...state, reload };
}
