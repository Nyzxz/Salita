import { useEffect, useMemo, useState } from 'react';
import type { ActivityTask, SubmissionRecord } from '@shared/types';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DashboardShell } from '../components/layout/DashboardShell';
import { useAuth } from '../auth/AuthContext';
import { fetchAllSubmissions, fetchTasks, gradeSubmission } from '../api/tasks';

interface DraftState {
  [submissionId: string]: {
    grade: string;
    feedback: string;
  };
}

export function TeacherGradingPage() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  const taskLookup = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  useEffect(() => {
    const token = session?.token;
    if (!token) {
      setIsLoading(false);
      return;
    }

    const safeToken = token;
    let active = true;

    async function load() {
      try {
        const [taskList, submissionList] = await Promise.all([
          fetchTasks(safeToken),
          fetchAllSubmissions(safeToken),
        ]);

        if (!active) return;

        setTasks(taskList);
        setSubmissions(submissionList);
        setDrafts(
          Object.fromEntries(
            submissionList.map((submission) => [
              submission.id,
              {
                grade: submission.grade?.toString() ?? '',
                feedback: submission.feedback ?? '',
              },
            ]),
          ),
        );
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load submissions.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [session?.token]);

  const handleDraftChange = (submissionId: string, field: 'grade' | 'feedback', value: string) => {
    setDrafts((current) => ({
      ...current,
      [submissionId]: {
        grade: current[submissionId]?.grade ?? '',
        feedback: current[submissionId]?.feedback ?? '',
        [field]: value,
      },
    }));
  };

  const handleSave = async (submission: SubmissionRecord) => {
    if (!session?.token) return;

    const task = taskLookup.get(submission.taskId);
    const draft = drafts[submission.id] ?? {
      grade: submission.grade?.toString() ?? '',
      feedback: submission.feedback ?? '',
    };

    const nextGrade = Number(draft.grade);
    if (!Number.isFinite(nextGrade) || nextGrade < 0 || (task && nextGrade > task.totalPoints)) {
      setError(task ? `Grade must be between 0 and ${task.totalPoints}.` : 'Enter a valid grade.');
      return;
    }

    setSavingId(submission.id);
    setError(null);

    try {
      const updated = await gradeSubmission(
        submission.id,
        {
          grade: nextGrade,
          feedback: draft.feedback.trim() || undefined,
        },
        session.token,
      );

      setSubmissions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDrafts((current) => ({
        ...current,
        [submission.id]: {
          grade: updated.grade?.toString() ?? '',
          feedback: updated.feedback ?? '',
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the grade.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardShell
      title="Grading center"
      subtitle="Review each student submission, assign a score, and leave teacher feedback."
    >
      {isLoading ? (
        <LoadingState label="Loading submissions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-night-border bg-night-panel p-6 text-muted">
          No submissions have been turned in yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-night-border bg-night-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-night/60 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Feedback</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => {
                  const task = taskLookup.get(submission.taskId);
                  const draft = drafts[submission.id] ?? {
                    grade: submission.grade?.toString() ?? '',
                    feedback: submission.feedback ?? '',
                  };
                  const isExpanded = expandedSubmissionId === submission.id;

                  return (
                    <>
                      <tr key={submission.id} className="border-t border-night-border align-top">
                        <td className="px-4 py-4">
                          <div className="font-medium text-parchment">{submission.studentName}</div>
                          <div className="text-xs text-muted">{submission.status}</div>
                        </td>
                        <td className="px-4 py-4 text-parchment">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubmissionId((current) =>
                                current === submission.id ? null : submission.id,
                              )
                            }
                            className="text-left font-medium underline decoration-gold/60 underline-offset-4 hover:text-gold"
                          >
                            {task?.title ?? submission.taskId}
                          </button>
                          {task && (
                            <div className="text-xs text-muted">
                              {task.totalPoints} points total
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-muted">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={0}
                            max={task?.totalPoints ?? 100}
                            value={draft.grade}
                            onChange={(event) => handleDraftChange(submission.id, 'grade', event.target.value)}
                            className="w-24 rounded-md border border-night-border bg-night px-3 py-2 text-parchment"
                          />
                          {task && <span className="ml-2 text-xs text-muted">/{task.totalPoints}</span>}
                        </td>
                        <td className="px-4 py-4">
                          <textarea
                            value={draft.feedback}
                            onChange={(event) =>
                              handleDraftChange(submission.id, 'feedback', event.target.value)
                            }
                            rows={3}
                            placeholder="Leave feedback for the student"
                            className="w-full min-w-[220px] rounded-md border border-night-border bg-night px-3 py-2 text-parchment"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => void handleSave(submission)}
                            disabled={savingId === submission.id}
                            className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingId === submission.id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${submission.id}-detail`} className="border-t border-night-border bg-night/40">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="rounded-lg border border-night-border bg-night-panel p-4">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                                Student answer
                              </div>
                              <div className="whitespace-pre-wrap text-sm leading-6 text-parchment">
                                {submission.submittedContent || 'No submission text was provided.'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
