import type { TaskType } from '@shared/types';
import type { useTasksAndSubmissions } from '../../hooks/useTasksAndSubmissions';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { TaskCard } from './TaskCard';

interface TaskListSectionProps {
  type: TaskType;
  title: string;
  subtitle: string;
  learning: ReturnType<typeof useTasksAndSubmissions>;
}

export function TaskListSection({ type, title, subtitle, learning }: TaskListSectionProps) {
  const { tasks, submissions, isLoading, error, reload, submit } = learning;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-parchment">{title}</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">{subtitle}</p>
      </div>

      {isLoading && <LoadingState label="Loading…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {tasks && !isLoading && !error && (
        <div className="flex flex-col gap-5">
          {tasks
            .filter((task) => task.type === type)
            .map((task) => (
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
