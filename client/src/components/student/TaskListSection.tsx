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

export function TaskListSection({ type, title, subtitle, learning }: TaskListSectionProps) {
  const { tasks, submissions, isLoading, error, reload, submit } = learning;
  const visible = tasks?.filter((task) => task.type === type) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <PageIntro eyebrow="Assignments" title={title} description={subtitle} />

      {isLoading && <LoadingState label="Loading…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {tasks && !isLoading && !error && visible.length === 0 && (
        <EmptyState
          icon={<ClipboardCheckIcon />}
          title={`No ${title.toLowerCase()} yet`}
          description="You're all caught up. New work from your teacher will appear here."
        />
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
