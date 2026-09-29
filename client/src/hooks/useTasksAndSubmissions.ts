import { useCallback, useEffect, useState } from 'react';
import type { ActivityTask, SubmissionRecord } from '@shared/types';
import { fetchMySubmissions, fetchTasks, submitTaskWork } from '../api/tasks';
import { ApiRequestError } from '../api/client';

/** Loads tasks + the student's own submissions together, and keeps them in sync after a submit. */
export function useTasksAndSubmissions(token: string) {
  const [tasks, setTasks] = useState<ActivityTask[] | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    Promise.all([fetchTasks(token), fetchMySubmissions(token)])
      .then(([taskList, submissionList]) => {
        setTasks(taskList);
        setSubmissions(submissionList);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiRequestError ? err.message : 'Could not load your work.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (taskId: string, content: string) => {
      const record = await submitTaskWork({ taskId, content }, token);
      setSubmissions((prev) => [...(prev?.filter((s) => s.taskId !== taskId) ?? []), record]);
    },
    [token],
  );

  return { tasks, submissions, isLoading, error, reload: load, submit };
}
