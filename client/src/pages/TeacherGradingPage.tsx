import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AutoTextarea } from '../components/ui/AutoTextarea';
import { formatDateTime } from '../lib/dates';
import type { ActivityTask, QuizAttemptRecord, SubmissionRecord, TaskType } from '@shared/types';
import { AttachmentAudio } from '../components/common/AttachmentAudio';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DashboardShell } from '../components/layout/DashboardShell';
import { BackLink } from '../components/layout/BackLink';
import { Avatar } from '../components/common/Avatar';
import { ChartIcon, ChevronRightIcon, ClipboardCheckIcon, QuizIcon, TargetIcon } from '../components/common/icons';
import { LIMITS } from '../lib/limits';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../auth/AuthContext';
import { downloadAttachment, fetchSubmissionPage, fetchTasks, gradeSubmission } from '../api/tasks';
import { fetchQuizResults, grantRetakes } from '../api/quizzes';
import { ApiRequestError, saveBlob } from '../api/client';
import { Notice } from '../components/ui/Notice';
import { DownloadIcon, PaperclipIcon } from '../components/common/icons';
import { onLive, throttledWhenLive } from '../lib/live';

type GradingTab = 'activities' | 'performance' | 'quizzes';

interface RubricDraft {
  points: string;
  feedback: string;
}

interface DraftState {
  [submissionId: string]: {
    grade: string;
    feedback: string;
    rubric?: RubricDraft[];
  };
}

interface Listing<T> {
  items: T[];
  total: number;
  page: number;
}

const EMPTY_LISTING = { items: [], total: 0, page: 1 } as const;
const TAB_TASK_TYPE: Record<'activities' | 'performance', TaskType> = { activities: 'ACTIVITY', performance: 'PERFORMANCE_TASK' };

/** Newest page first, then anything older that was already loaded with "Load more". */
function mergeFirstPage<T extends { id: string }>(fresh: T[], existing: T[]): T[] {
  const freshIds = new Set(fresh.map((item) => item.id));
  return [...fresh, ...existing.filter((item) => !freshIds.has(item.id))];
}

export function TeacherGradingPage() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [activities, setActivities] = useState<Listing<SubmissionRecord>>({ ...EMPTY_LISTING, items: [] });
  const [performance, setPerformance] = useState<Listing<SubmissionRecord>>({ ...EMPTY_LISTING, items: [] });
  const [quizAttempts, setQuizAttempts] = useState<Listing<QuizAttemptRecord>>({ ...EMPTY_LISTING, items: [] });
  const [pending, setPending] = useState({ activities: 0, performance: 0 });
  const [onlyAwaiting, setOnlyAwaiting] = useState(false);
  const onlyAwaitingRef = useRef(false);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GradingTab>('activities');
  const [selectedAttempts, setSelectedAttempts] = useState<Set<string>>(new Set());
  const [retakeNotice, setRetakeNotice] = useState<string | null>(null);
  const [isGranting, setIsGranting] = useState(false);
  const knownRef = useRef<Map<string, SubmissionRecord>>(new Map());
  const refreshRef = useRef<(isRefresh: boolean) => Promise<void>>(async () => undefined);

  const taskLookup = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  /** Keeps what the teacher is typing, unless the student has submitted again since it was loaded. */
  const syncDrafts = (incoming: SubmissionRecord[], isRefresh: boolean) => {
    setDrafts((current) => {
      const next: DraftState = { ...current };
      for (const submission of incoming) {
        const before = knownRef.current.get(submission.id);
        const unchanged = before && before.submittedAt === submission.submittedAt && before.status === submission.status;
        if (!(isRefresh && unchanged && current[submission.id])) {
          next[submission.id] = { grade: submission.grade?.toString() ?? '', feedback: submission.feedback ?? '' };
        }
        knownRef.current.set(submission.id, submission);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    let active = true;

    // Loads page 1 of whatever tab is open, plus the "to grade" counts for the tab badges.
    async function load(isRefresh: boolean) {
      try {
        const tab = activeTabRef.current;
        const [taskList, activityPending, performancePending] = await Promise.all([
          fetchTasks(),
          fetchSubmissionPage({ taskType: 'ACTIVITY', status: 'PENDING', limit: 1 }),
          fetchSubmissionPage({ taskType: 'PERFORMANCE_TASK', status: 'PENDING', limit: 1 }),
        ]);
        if (!active) return;
        setTasks(taskList);
        setPending({ activities: activityPending.meta.total, performance: performancePending.meta.total });

        if (tab === 'quizzes') {
          const page = await fetchQuizResults(1, 50);
          if (!active) return;
          setQuizAttempts((current) => ({ items: mergeFirstPage(page.items, current.items), total: page.meta.total, page: current.page }));
        } else {
          const page = await fetchSubmissionPage({ taskType: TAB_TASK_TYPE[tab], limit: 50, ...(onlyAwaitingRef.current ? { status: 'PENDING' as const } : {}) });
          if (!active) return;
          const setter = tab === 'activities' ? setActivities : setPerformance;
          setter((current) => ({ items: mergeFirstPage(page.items, current.items), total: page.meta.total, page: current.page }));
          syncDrafts(page.items, isRefresh);
        }
        setError(null);
      } catch (err) {
        if (!active) return;
        // A failed background refresh keeps showing what we have; only the first load reports an error.
        if (!isRefresh) setError(err instanceof Error ? err.message : 'Could not load submissions.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    refreshRef.current = load;

    void load(false);

    // Refresh every 10 seconds while the tab is visible, so new and resubmitted work shows up.
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const interval = window.setInterval(throttledWhenLive(refreshWhenVisible), 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const stopLive = onLive(() => void load(true));

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      stopLive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const toggleAttempt = (id: string) => {
    setRetakeNotice(null);
    setSelectedAttempts((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allowRetakes = async () => {
    setIsGranting(true);
    setActionError(null);
    setRetakeNotice(null);
    try {
      // One request per quiz, listing every chosen student.
      const byQuiz = new Map<string, Set<string>>();
      quizAttempts.items.forEach((attempt) => {
        if (!selectedAttempts.has(attempt.id)) return;
        byQuiz.set(attempt.quizId, (byQuiz.get(attempt.quizId) ?? new Set()).add(attempt.studentId));
      });
      let granted = 0;
      for (const [quizId, students] of byQuiz) {
        granted += (await grantRetakes(quizId, [...students])).granted;
      }
      setSelectedAttempts(new Set());
      setRetakeNotice(`Retake opened for ${granted} student${granted === 1 ? '' : 's'}.`);
      await refreshRef.current(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open the retake.');
    } finally {
      setIsGranting(false);
    }
  };

  const activeTabRef = useRef<GradingTab>('activities');
  const changeTab = (tab: GradingTab) => {
    activeTabRef.current = tab;
    setActiveTab(tab);
    setActionError(null);
    void refreshRef.current(false);
  };

  const loadMore = async () => {
    setIsLoadingMore(true);
    setActionError(null);
    try {
      if (activeTab === 'quizzes') {
        const page = await fetchQuizResults(quizAttempts.page + 1, 50);
        setQuizAttempts((current) => ({
          items: [...current.items, ...page.items.filter((item) => !current.items.some((existing) => existing.id === item.id))],
          total: page.meta.total,
          page: current.page + 1,
        }));
      } else {
        const listing = activeTab === 'activities' ? activities : performance;
        const page = await fetchSubmissionPage({ taskType: TAB_TASK_TYPE[activeTab], page: listing.page + 1, limit: 50, ...(onlyAwaitingRef.current ? { status: 'PENDING' as const } : {}) });
        const setter = activeTab === 'activities' ? setActivities : setPerformance;
        setter((current) => ({
          items: [...current.items, ...page.items.filter((item) => !current.items.some((existing) => existing.id === item.id))],
          total: page.meta.total,
          page: current.page + 1,
        }));
        syncDrafts(page.items, false);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not load more.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleAwaiting = () => {
    const next = !onlyAwaitingRef.current;
    onlyAwaitingRef.current = next;
    setOnlyAwaiting(next);
    // Start the list over so graded items from the unfiltered view don't linger.
    setActivities({ ...EMPTY_LISTING, items: [] });
    setPerformance({ ...EMPTY_LISTING, items: [] });
    void refreshRef.current(false);
  };

  /** The draft for a submission, with rubric rows filled in from the task and any saved marks. */
  const draftFor = (submission: SubmissionRecord) => {
    const existing = drafts[submission.id];
    const task = taskLookup.get(submission.taskId);
    const rubric =
      existing?.rubric ??
      task?.rubric?.map((_criterion, index) => ({
        points: submission.rubricScores?.[index]?.points?.toString() ?? '',
        feedback: submission.rubricScores?.[index]?.feedback ?? '',
      }));
    return {
      grade: existing?.grade ?? submission.grade?.toString() ?? '',
      feedback: existing?.feedback ?? submission.feedback ?? '',
      ...(rubric ? { rubric } : {}),
    };
  };

  const handleDraftChange = (submission: SubmissionRecord, field: 'grade' | 'feedback', value: string) => {
    const base = draftFor(submission);
    setDrafts((current) => ({ ...current, [submission.id]: { ...base, [field]: value } }));
  };

  const handleRubricChange = (submission: SubmissionRecord, index: number, field: keyof RubricDraft, value: string) => {
    const base = draftFor(submission);
    const rubric = (base.rubric ?? []).map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row));
    const total = rubric.reduce((sum, row) => sum + (Number(row.points) || 0), 0);
    setDrafts((current) => ({ ...current, [submission.id]: { ...base, rubric, grade: String(total) } }));
  };

  const handleSave = async (submission: SubmissionRecord, goNext = false) => {
    if (!session) return;

    const task = taskLookup.get(submission.taskId);
    const draft = draftFor(submission);
    const criteria = task?.rubric;
    if (criteria && draft.rubric) {
      const problem = draft.rubric.findIndex((row, index) => row.points.trim() === '' || !Number.isFinite(Number(row.points)) || Number(row.points) < 0 || Number(row.points) > criteria[index].maxPoints);
      if (problem >= 0) {
        setActionError(`Enter 0–${criteria[problem].maxPoints} points for “${criteria[problem].name}”.`);
        return;
      }
    }

    const nextGrade = Number(draft.grade);
    if (!criteria && (draft.grade.trim() === '' || !Number.isFinite(nextGrade) || nextGrade < 0 || (task && nextGrade > task.totalPoints))) {
      setActionError(task ? `Grade must be between 0 and ${task.totalPoints}.` : 'Enter a valid grade.');
      return;
    }

    setSavingId(submission.id);
    setActionError(null);

    try {
      const updated = await gradeSubmission(submission.id, {
        grade: nextGrade,
        ...(criteria && draft.rubric
          ? { rubricScores: draft.rubric.map((row) => ({ points: Number(row.points), ...(row.feedback.trim() ? { feedback: row.feedback.trim() } : {}) })) }
          : {}),
        feedback: draft.feedback.trim() || undefined,
        // Lets the server refuse the save if the student resubmitted while this was open.
        expectedSubmittedAt: submission.submittedAt,
      });

      const replace = (current: Listing<SubmissionRecord>) => ({
        ...current,
        items: current.items.map((item) => (item.id === updated.id ? updated : item)),
      });
      setActivities(replace);
      setPerformance(replace);
      knownRef.current.set(updated.id, updated);
      setDrafts((current) => ({
        ...current,
        [submission.id]: { grade: updated.grade?.toString() ?? '', feedback: updated.feedback ?? '' },
      }));
      void refreshRef.current(true);
      if (goNext) openNextAwaiting(submission.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the grade.');
      // A conflict means the work changed: reload so the new version (and a fresh draft) is shown.
      if (err instanceof ApiRequestError && err.status === 409) void refreshRef.current(false);
    } finally {
      setSavingId(null);
    }
  };

  /** Opens the next submission that still needs a grade, so a stack can be marked without hunting. */
  const openNextAwaiting = (currentId: string) => {
    const list = activeTab === 'activities' ? activities.items : performance.items;
    const start = list.findIndex((item) => item.id === currentId);
    const ordered = [...list.slice(start + 1), ...list.slice(0, Math.max(start, 0))];
    const next = ordered.find((item) => item.id !== currentId && item.status === 'PENDING');
    if (!next) {
      setExpandedSubmissionId(null);
      setActionError(null);
      setRetakeNotice('That was the last one waiting for a grade.');
      return;
    }
    setExpandedSubmissionId(next.id);
    window.setTimeout(() => document.getElementById(`submission-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const handleDownload = async (submission: SubmissionRecord) => {
    if (!submission.attachment) return;
    setActionError(null);
    try {
      saveBlob(await downloadAttachment(submission.attachment.id), submission.attachment.fileName);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download that file.');
    }
  };

  const needsGrading = pending;

  const tabs = [
    { id: 'activities', label: 'Activities', icon: ClipboardCheckIcon, count: activities.total, pending: needsGrading.activities },
    { id: 'performance', label: 'Performance tasks', icon: TargetIcon, count: performance.total, pending: needsGrading.performance },
    { id: 'quizzes', label: 'Quizzes', icon: QuizIcon, count: quizAttempts.total, pending: 0 },
  ] as const;
  const activeListing = activeTab === 'activities' ? activities : performance;
  const visibleSubmissions = activeListing.items;
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
              onClick={() => changeTab(id)}
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

      {actionError && <Notice tone="error" className="mb-6">{actionError}</Notice>}

      <div key={activeTab} className="animate-fade-in-up">
        {activeTab !== 'quizzes' && (
          <>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter submissions">
        <button type="button" aria-pressed={!onlyAwaiting} onClick={() => onlyAwaiting && toggleAwaiting()} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${!onlyAwaiting ? 'border-gold bg-gold/15 text-parchment' : 'border-night-border text-muted hover:text-parchment'}`}>
          All submissions
        </button>
        <button type="button" aria-pressed={onlyAwaiting} onClick={() => !onlyAwaiting && toggleAwaiting()} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${onlyAwaiting ? 'border-gold bg-gold/15 text-parchment' : 'border-night-border text-muted hover:text-parchment'}`}>
          Submitted, awaiting grade <span className="text-xs opacity-70">{activeTab === 'activities' ? pending.activities : pending.performance}</span>
        </button>
      </div>
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
                  const draft = draftFor(submission);
                  const hasRubric = (task?.rubric?.length ?? 0) > 0;
                  const isExpanded = expandedSubmissionId === submission.id;

                  return (
                    <Fragment key={submission.id}>
                      <tr id={`submission-${submission.id}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={submission.studentName} size="sm" accent="leaf" />
                            <div>
                              <div className="font-medium text-parchment">{submission.studentName}</div>
                              <span className={submission.status === 'GRADED' ? 'badge-leaf mt-1' : 'badge-gold mt-1'}>
                                {submission.status === 'GRADED' ? 'Graded' : 'Needs grading'}
                              </span>
                              {submission.resubmitted && <span className="badge-clay ml-1.5 mt-1">Resubmitted</span>}
                              {submission.late && <span className="badge-clay ml-1.5 mt-1">Late</span>}
                              {submission.attachment && <span className="badge-neutral ml-1.5 mt-1"><PaperclipIcon className="h-3 w-3" />File</span>}
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
                          {formatDateTime(submission.submittedAt)}
                        </td>
                        <td className="whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            max={task?.totalPoints ?? 100}
                            value={draft.grade}
                            aria-label={`Grade for ${submission.studentName}`}
                            readOnly={hasRubric}
                            title={hasRubric ? 'Total of the rubric marks (open the row to score each criterion)' : undefined}
                            onChange={(event) => handleDraftChange(submission, 'grade', event.target.value)}
                            className="field w-20 py-2"
                          />
                          {task && <span className="ml-2 text-xs text-muted">/ {task.totalPoints}</span>}
                        </td>
                        <td>
                          <AutoTextarea
                            value={draft.feedback}
                            onChange={(event) =>
                              handleDraftChange(submission, 'feedback', event.target.value)
                            }
                            rows={2}
                            maxLength={LIMITS.feedback}
                            aria-label={`Feedback for ${submission.studentName}`}
                            placeholder="Leave feedback for the student"
                            className="field min-w-[260px]"
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
                          <button
                            type="button"
                            onClick={() => void handleSave(submission, true)}
                            disabled={savingId === submission.id}
                            className="btn-secondary btn-sm ml-2"
                            title="Save this grade and open the next submission waiting for one"
                          >
                            Save &amp; next
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
                            {submission.attachment?.contentType.startsWith('audio/') && (
                              <div className="mt-3"><AttachmentAudio id={submission.attachment.id} /></div>
                            )}
                            {submission.attachment && (
                              <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => void handleDownload(submission)}>
                                <DownloadIcon className="h-3.5 w-3.5" /> {submission.attachment.fileName}
                              </button>
                            )}
                            {hasRubric && task?.rubric && draft.rubric && (
                              <div className="mt-5">
                                <p className="eyebrow">Rubric — score each criterion</p>
                                <ul className="mt-2 flex flex-col gap-3">
                                  {task.rubric.map((criterion, index) => (
                                    <li key={criterion.name + index} className="grid gap-2 rounded-xl border border-night-border bg-night-panel p-3 sm:grid-cols-[1fr_auto_2fr] sm:items-center">
                                      <div>
                                        <p className="text-sm font-medium text-parchment">{criterion.name}</p>
                                        {criterion.description && <p className="text-xs text-muted">{criterion.description}</p>}
                                      </div>
                                      <label className="flex items-center gap-2 text-xs text-muted">
                                        <input
                                          type="number"
                                          min={0}
                                          max={criterion.maxPoints}
                                          value={draft.rubric?.[index]?.points ?? ''}
                                          aria-label={`${criterion.name} points for ${submission.studentName}`}
                                          onChange={(event) => handleRubricChange(submission, index, 'points', event.target.value)}
                                          className="field w-20 py-2"
                                        />
                                        / {criterion.maxPoints}
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={500}
                                        value={draft.rubric?.[index]?.feedback ?? ''}
                                        aria-label={`${criterion.name} feedback for ${submission.studentName}`}
                                        placeholder="Comment on this criterion (optional)"
                                        onChange={(event) => handleRubricChange(submission, index, 'feedback', event.target.value)}
                                        className="field py-2"
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {submission.revisions && submission.revisions.length > 0 && (
                              <details className="mt-5">
                                <summary className="cursor-pointer text-sm text-muted hover:text-parchment">Earlier versions ({submission.revisions.length})</summary>
                                <ol className="mt-2 flex flex-col gap-2">
                                  {[...submission.revisions].reverse().map((revision) => (
                                    <li key={revision.submittedAt} className="rounded-xl border border-night-border bg-night-panel p-3 text-sm">
                                      <p className="text-xs text-muted">
                                        {formatDateTime(revision.submittedAt)}
                                        {revision.grade !== undefined ? ` · graded ${revision.grade}` : ''}
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-parchment/90">{revision.content}</p>
                                      {revision.feedback && <p className="mt-2 text-xs text-gold">Your feedback then: {revision.feedback}</p>}
                                    </li>
                                  ))}
                                </ol>
                              </details>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleSubmissions.length < activeListing.total && (
            <div className="flex items-center justify-between gap-3 border-t border-night-border px-4 py-3 text-sm text-muted">
              <span>Showing {visibleSubmissions.length} of {activeListing.total}</span>
              <button type="button" className="btn-secondary btn-sm" disabled={isLoadingMore} onClick={() => void loadMore()}>
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
          </>
        )}
        {activeTab === 'quizzes' && (
      <section aria-labelledby="quiz-results-heading">
        <h2 id="quiz-results-heading" className="text-xl font-semibold text-parchment">
          Quiz results
        </h2>
        <p className="mt-1 text-sm text-muted">
          Each student gets one attempt. Tick the students who may try again and press “Allow retake” — the retake score is reduced by a random 1–5 percentage points (for example, 80% becomes 75–79%).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary btn-sm" disabled={selectedAttempts.size === 0 || isGranting} onClick={() => void allowRetakes()}>
            {isGranting ? 'Opening…' : `Allow retake${selectedAttempts.size > 0 ? ` (${selectedAttempts.size})` : ''}`}
          </button>
          {selectedAttempts.size > 0 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSelectedAttempts(new Set())}>Clear selection</button>
          )}
          {retakeNotice && <span role="status" className="text-sm text-leaf">{retakeNotice}</span>}
        </div>
        <div className="mt-5">
          {quizAttempts.items.length === 0 ? (
            <EmptyState icon={<ChartIcon />} title="No quiz attempts yet" description="Results appear here as students complete quizzes." />
          ) : (
            <div className="table-wrap overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10"><span className="sr-only">Select</span></th>
                    <th>Student</th>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttempts.items.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="accent-gold"
                          aria-label={`Select ${attempt.studentName} for a retake of ${attempt.quizTitle}`}
                          disabled={attempt.retakeOpen}
                          checked={selectedAttempts.has(attempt.id)}
                          onChange={() => toggleAttempt(attempt.id)}
                        />
                      </td>
                      <td className="font-medium text-parchment">{attempt.studentName}</td>
                      <td className="text-parchment">{attempt.quizTitle}</td>
                      <td>
                        <span className={attempt.percentageScore >= 75 ? 'badge-leaf' : attempt.percentageScore >= 50 ? 'badge-gold' : 'badge-clay'}>
                          {attempt.percentageScore}%
                        </span>
                        <span className="ml-2 text-xs text-muted">{attempt.scoreObtained}/{attempt.totalPossiblePoints}</span>
                        {attempt.penaltyPercent ? <span className="badge-neutral ml-2">retake −{attempt.penaltyPercent}%</span> : null}
                        {attempt.retakeOpen ? <span className="badge-gold ml-2">Retake unlocked</span> : null}
                      </td>
                      <td className="text-muted">{formatDateTime(attempt.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quizAttempts.items.length < quizAttempts.total && (
                <div className="flex items-center justify-between gap-3 border-t border-night-border px-4 py-3 text-sm text-muted">
                  <span>Showing {quizAttempts.items.length} of {quizAttempts.total}</span>
                  <button type="button" className="btn-secondary btn-sm" disabled={isLoadingMore} onClick={() => void loadMore()}>
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
        )}
      </div>
    </DashboardShell>
  );
}
