import { useState } from 'react';
import type { TaskType } from '@shared/types';
import type { useTasksAndSubmissions } from '../../hooks/useTasksAndSubmissions';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { ClipboardCheckIcon } from '../common/icons';
import { EmptyState } from '../ui/EmptyState';
import { PageIntro } from '../ui/PageIntro';
import { TaskCard } from './TaskCard';

interface TaskListSectionProps {
  type: TaskType;
  title: string;
  subtitle: string;
  learning: ReturnType<typeof useTasksAndSubmissions>;
}

type TaskFilter = 'ALL' | 'TODO' | 'SUBMITTED' | 'GRADED';
const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'TODO', label: 'To do' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'GRADED', label: 'Graded' },
];

export function TaskListSection({ type, title, subtitle, learning }: TaskListSectionProps) {
  const { tasks, submissions, isLoading, error, reload, submit } = learning;
  const [filter, setFilter] = useState<TaskFilter>('ALL');
  const now = Date.now();
  const stateOf = (taskId: string): 'TODO' | 'SUBMITTED' | 'GRADED' => {
    const found = submissions?.find((submission) => submission.taskId === taskId);
    return !found ? 'TODO' : found.status === 'GRADED' ? 'GRADED' : 'SUBMITTED';
  };
  // Overdue work first, then what is due soonest, then work that is already in.
  const rank = (task: { id: string; dueDate: string }): number => {
    const state = stateOf(task.id);
    if (state === 'GRADED') return 3;
    if (state === 'SUBMITTED') return 2;
    return new Date(task.dueDate).getTime() < now ? 0 : 1;
  };
  const all = (tasks?.filter((task) => task.type === type) ?? []).sort(
    (a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate),
  );
  const visible = all.filter((task) => filter === 'ALL' || stateOf(task.id) === filter);

  return (
    <section className="flex flex-col gap-6">
      <PageIntro eyebrow="Assignments" title={title} description={subtitle} />

      {isLoading && <LoadingState label="Loading…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {tasks && !isLoading && !error && all.length === 0 && (
        <EmptyState
          icon={<ClipboardCheckIcon />}
          title={`No ${title.toLowerCase()} yet`}
          description="You're all caught up. New work from your teacher will appear here."
        />
      )}

      {tasks && !isLoading && !error && all.length > 0 && (
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((option) => {
            const count = all.filter((task) => option.id === 'ALL' || stateOf(task.id) === option.id).length;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${filter === option.id ? 'border-gold bg-gold/15 text-parchment' : 'border-night-border text-muted hover:text-parchment'}`}
              >
                {option.label} <span className="text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {tasks && !isLoading && !error && all.length > 0 && visible.length === 0 && (
        <p className="text-sm text-muted">Nothing here with that filter.</p>
      )}

      {tasks && !isLoading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-5">
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              submission={submissions?.find((s) => s.taskId === task.id)}
              onSubmit={submit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
