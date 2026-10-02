import { useCallback, useEffect, useState } from 'react';
import type { ActivityTask, SubmissionRecord } from '@shared/types';
import { fetchMySubmissions, fetchTasks, submitTaskWork } from '../api/tasks';
import { ApiRequestError } from '../api/client';

/** Loads the student's work and refreshes it periodically while the page is open. */
export function useTasksAndSubmissions(token: string) {
  const [tasks, setTasks] = useState<ActivityTask[] | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [taskList, submissionList] = await Promise.all([fetchTasks(token), fetchMySubmissions(token)]);
      setTasks(taskList);
      setSubmissions(submissionList);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load your work.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const interval = window.setInterval(refreshWhenVisible, 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
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
