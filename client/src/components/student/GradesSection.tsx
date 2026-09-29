import type { useTasksAndSubmissions } from '../../hooks/useTasksAndSubmissions';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';

interface GradesSectionProps {
  learning: ReturnType<typeof useTasksAndSubmissions>;
}

export function GradesSection({ learning }: GradesSectionProps) {
  const { tasks, submissions, isLoading, error, reload } = learning;

  const rows = (submissions ?? [])
    .map((submission) => ({ submission, task: tasks?.find((t) => t.id === submission.taskId) }))
    .filter((row): row is { submission: typeof row.submission; task: NonNullable<typeof row.task> } =>
      Boolean(row.task),
    );

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-parchment">My performance & grades</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Scores and feedback for the activities and performance tasks you've submitted.
        </p>
      </div>

      {isLoading && <LoadingState label="Loading grades…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!isLoading && !error && rows.length === 0 && (
        <p className="text-sm text-muted">
          Nothing submitted yet — your grades will show up here once you turn in an activity or
          performance task.
        </p>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-night-border">
          <table className="min-w-full divide-y divide-night-border text-left text-sm">
            <thead className="bg-night-panel text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-night-border bg-night">
              {rows.map(({ submission, task }) => (
                <tr key={submission.id}>
                  <td className="px-4 py-3 text-parchment">{task.title}</td>
                  <td className="px-4 py-3 text-muted">
                    {task.type === 'ACTIVITY' ? 'Activity' : 'Performance task'}
                  </td>
                  <td className="px-4 py-3">
                    {submission.status === 'GRADED' ? (
                      <span className="text-leaf">
                        {submission.grade}/{task.totalPoints}
                      </span>
                    ) : (
                      <span className="text-muted">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{submission.feedback ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
