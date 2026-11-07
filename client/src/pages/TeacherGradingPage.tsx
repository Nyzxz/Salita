import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityTask, QuizAttemptRecord, SubmissionRecord, TaskType } from '@shared/types';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DashboardShell } from '../components/layout/DashboardShell';
import { BackLink } from '../components/layout/BackLink';
import { Avatar } from '../components/common/Avatar';
import { ChartIcon, ChevronRightIcon, ClipboardCheckIcon, QuizIcon, TargetIcon } from '../components/common/icons';
import { LIMITS } from '../lib/limits';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../auth/AuthContext';
import { fetchAllSubmissions, fetchTasks, gradeSubmission } from '../api/tasks';
import { fetchQuizResults } from '../api/quizzes';

type GradingTab = 'activities' | 'performance' | 'quizzes';

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
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GradingTab>('activities');
  const submissionsRef = useRef<SubmissionRecord[]>([]);

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

    async function load(isRefresh: boolean) {
      try {
        const [taskList, submissionList, quizResultList] = await Promise.all([
          fetchTasks(safeToken),
          fetchAllSubmissions(safeToken),
          fetchQuizResults(safeToken),
        ]);

        if (!active) return;
        const previous = new Map(submissionsRef.current.map((item) => [item.id, item]));
        submissionsRef.current = submissionList;
        setTasks(taskList);
        setSubmissions(submissionList);
        setQuizAttempts(quizResultList);
        setDrafts((current) => {
          const next: DraftState = {};
          for (const submission of submissionList) {
            const before = previous.get(submission.id);
            // Keep what the teacher is typing, unless the student has submitted again since.
            const unchanged = before && before.submittedAt === submission.submittedAt && before.status === submission.status;
            next[submission.id] =
              isRefresh && unchanged && current[submission.id]
                ? current[submission.id]
                : { grade: submission.grade?.toString() ?? '', feedback: submission.feedback ?? '' };
          }
          return next;
        });
        setError(null);
      } catch (err) {
        if (!active) return;
        // A failed background refresh keeps showing what we have; only the first load reports an error.
        if (!isRefresh) setError(err instanceof Error ? err.message : 'Could not load submissions.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load(false);

    // Refresh every 10 seconds while the tab is visible, so new and resubmitted work shows up.
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const interval = window.setInterval(refreshWhenVisible, 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
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

  const typeOf = (submission: SubmissionRecord): TaskType => taskLookup.get(submission.taskId)?.type ?? 'ACTIVITY';
  const activitySubmissions = submissions.filter((item) => typeOf(item) === 'ACTIVITY');
  const performanceSubmissions = submissions.filter((item) => typeOf(item) === 'PERFORMANCE_TASK');
  const needsGrading = (items: SubmissionRecord[]) => items.filter((item) => item.status !== 'GRADED').length;

  const tabs = [
    { id: 'activities', label: 'Activities', icon: ClipboardCheckIcon, count: activitySubmissions.length, pending: needsGrading(activitySubmissions) },
    { id: 'performance', label: 'Performance tasks', icon: TargetIcon, count: performanceSubmissions.length, pending: needsGrading(performanceSubmissions) },
    { id: 'quizzes', label: 'Quizzes', icon: QuizIcon, count: quizAttempts.length, pending: 0 },
  ] as const;
  const visibleSubmissions = activeTab === 'activities' ? activitySubmissions : performanceSubmissions;
  const tabNoun = activeTab === 'activities' ? 'activity' : 'performance task';

  return (
    <DashboardShell
      eyebrow="Teacher workspace"
      title="Grading center"
      subtitle="Review each student submission, assign a score, and leave teacher feedback."
      actions={<BackLink />}
    >
      <div role="tablist" aria-label="Grading sections" className="mb-8 flex gap-1 overflow-x-auto border-b border-night-border">
        {tabs.map(({ id, label, icon: Icon, count, pending }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id)}
              className={`-mb-px flex flex-none items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? 'border-gold text-parchment' : 'border-transparent text-muted hover:text-parchment'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-gold' : ''}`} />
              {label}
              <span className={pending > 0 ? 'badge-gold' : 'badge-neutral'}>{pending > 0 ? `${pending} to grade` : count}</span>
            </button>
          );
        })}
      </div>

      <div key={activeTab} className="animate-fade-in-up">
        {activeTab !== 'quizzes' && (
          <>
      {isLoading ? (
        <LoadingState label="Loading submissions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : visibleSubmissions.length === 0 ? (
        <EmptyState icon={<ClipboardCheckIcon />} title={`No ${tabNoun} submissions yet`} description="Student work will appear here as soon as it's turned in." />
      ) : (
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Task</th>
                  <th>Submitted</th>
                  <th>Grade</th>
                  <th>Feedback</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubmissions.map((submission) => {
                  const task = taskLookup.get(submission.taskId);
                  const draft = drafts[submission.id] ?? {
                    grade: submission.grade?.toString() ?? '',
                    feedback: submission.feedback ?? '',
                  };
                  const isExpanded = expandedSubmissionId === submission.id;

                  return (
                    <Fragment key={submission.id}>
                      <tr>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={submission.studentName} size="sm" accent="leaf" />
                            <div>
                              <div className="font-medium text-parchment">{submission.studentName}</div>
                              <span className={submission.status === 'GRADED' ? 'badge-leaf mt-1' : 'badge-gold mt-1'}>
                                {submission.status === 'GRADED' ? 'Graded' : 'Needs grading'}
                              </span>
                              {submission.resubmitted && <span className="badge-clay ml-1.5 mt-1">Resubmitted</span>}
                            </div>
                          </div>
                        </td>
                        <td className="text-parchment">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedSubmissionId((current) =>
                                current === submission.id ? null : submission.id,
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-left font-medium transition-colors hover:text-gold"
                          >
                            {task?.title ?? submission.taskId}
                            <ChevronRightIcon className={`h-3.5 w-3.5 flex-none transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          {task && <div className="mt-0.5 text-xs text-muted">{task.totalPoints} points total</div>}
                        </td>
                        <td className="whitespace-nowrap text-muted">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            max={task?.totalPoints ?? 100}
                            value={draft.grade}
                            aria-label={`Grade for ${submission.studentName}`}
                            onChange={(event) => handleDraftChange(submission.id, 'grade', event.target.value)}
                            className="field w-20 py-2"
                          />
                          {task && <span className="ml-2 text-xs text-muted">/ {task.totalPoints}</span>}
                        </td>
                        <td>
                          <textarea
                            value={draft.feedback}
                            onChange={(event) =>
                              handleDraftChange(submission.id, 'feedback', event.target.value)
                            }
                            rows={2}
                            maxLength={LIMITS.feedback}
                            aria-label={`Feedback for ${submission.studentName}`}
                            placeholder="Leave feedback for the student"
                            className="field min-w-[220px]"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void handleSave(submission)}
                            disabled={savingId === submission.id}
                            className="btn-primary btn-sm"
                          >
                            {savingId === submission.id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-night-deep/40">
                          <td colSpan={6} className="!py-5">
                            <p className="eyebrow">Student answer</p>
                            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-night-border bg-night-panel p-4 text-sm leading-6 text-parchment">
                              {submission.submittedContent || 'No submission text was provided.'}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
          </>
        )}
        {activeTab === 'quizzes' && (
      <section aria-labelledby="quiz-results-heading">
        <h2 id="quiz-results-heading" className="text-xl font-semibold text-parchment">
          Quiz results
        </h2>
        <p className="mt-1 text-sm text-muted">Scores are calculated on the server when students submit.</p>
        <div className="mt-5">
          {quizAttempts.length === 0 ? (
            <EmptyState icon={<ChartIcon />} title="No quiz attempts yet" description="Results appear here as students complete quizzes." />
          ) : (
            <div className="table-wrap overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td className="font-medium text-parchment">{attempt.studentName}</td>
                      <td className="text-parchment">{attempt.quizTitle}</td>
                      <td>
                        <span className={attempt.percentageScore >= 75 ? 'badge-leaf' : attempt.percentageScore >= 50 ? 'badge-gold' : 'badge-clay'}>
                          {attempt.percentageScore}%
                        </span>
                        <span className="ml-2 text-xs text-muted">{attempt.scoreObtained}/{attempt.totalPossiblePoints}</span>
                      </td>
                      <td className="text-muted">{new Date(attempt.completedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
        )}
      </div>
    </DashboardShell>
  );
}
