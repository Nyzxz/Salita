import type { useTasksAndSubmissions } from '../../hooks/useTasksAndSubmissions';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { ChartIcon } from '../common/icons';
import { EmptyState } from '../ui/EmptyState';
import { PageIntro } from '../ui/PageIntro';

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
      <PageIntro
        eyebrow="Progress"
        title="My performance & grades"
        description="Scores and feedback for the activities and performance tasks you've submitted."
      />

      {isLoading && <LoadingState label="Loading grades…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          icon={<ChartIcon />}
          title="Nothing graded yet"
          description="Your grades will show up here once you turn in an activity or performance task."
        />
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Type</th>
                <th>Score</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ submission, task }) => {
                const pct = submission.status === 'GRADED' && task.totalPoints > 0 ? Math.round(((submission.grade ?? 0) / task.totalPoints) * 100) : null;
                return (
                  <tr key={submission.id}>
                    <td className="font-medium text-parchment">{task.title}</td>
                    <td>
                      <span className="badge-neutral">{task.type === 'ACTIVITY' ? 'Activity' : 'Performance task'}</span>
                    </td>
                    <td>
                      {pct !== null ? (
                        <div className="flex items-center gap-3">
                          <span className="font-semibold tabular-nums text-parchment">
                            {submission.grade}/{task.totalPoints}
                          </span>
                          <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-night-deep sm:block" aria-hidden="true">
                            <span
                              className={`block h-full rounded-full ${pct >= 75 ? 'bg-leaf' : pct >= 50 ? 'bg-gold' : 'bg-clay'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                        </div>
                      ) : (
                        <span className="badge-gold">Pending</span>
                      )}
                    </td>
                    <td className="max-w-sm text-muted">{submission.feedback ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
