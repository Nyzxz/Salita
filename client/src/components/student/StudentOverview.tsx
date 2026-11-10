import { useEffect, useState } from 'react';
import type { QuizAttemptRecord, QuizContent } from '@shared/types';
import { fetchMyQuizAttempts, fetchQuizzes } from '../../api/quizzes';
import { onLive } from '../../lib/live';
import type { useTasksAndSubmissions } from '../../hooks/useTasksAndSubmissions';
import { PageIntro } from '../ui/PageIntro';
import { BookIcon, ChartIcon, ClipboardCheckIcon, QuizIcon, TargetIcon } from '../common/icons';
import type { StudentTab } from './StudentSidebar';

interface StudentOverviewProps {
  name: string;
  learning: ReturnType<typeof useTasksAndSubmissions>;
  onOpen: (tab: StudentTab) => void;
}

/** The Dashboard page: a short summary only. Everything else lives in its own section. */
export function StudentOverview({ name, learning, onOpen }: StudentOverviewProps) {
  const [quizzes, setQuizzes] = useState<QuizContent[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      Promise.all([fetchQuizzes(), fetchMyQuizAttempts()])
        .then(([quizList, attemptList]) => {
          if (!active) return;
          setQuizzes(quizList);
          setAttempts(attemptList);
        })
        .catch(() => undefined);
    };
    load();
    const stop = onLive(load);
    return () => {
      active = false;
      stop();
    };
  }, []);

  const tasks = learning.tasks ?? [];
  const submissions = learning.submissions ?? [];
  const submitted = new Set(submissions.map((submission) => submission.taskId));
  const open = (type: 'ACTIVITY' | 'PERFORMANCE_TASK') =>
    tasks.filter((task) => task.type === type && !submitted.has(task.id)).length;
  const tookQuiz = new Set(attempts.map((attempt) => attempt.quizId));
  const quizzesToDo = (quizzes ?? []).filter((quiz) => !tookQuiz.has(quiz.id) || quiz.retakeOpen).length;
  const graded = submissions.filter((submission) => submission.status === 'GRADED').length;

  const cards: { tab: StudentTab; label: string; value: number | string; hint: string; icon: typeof BookIcon }[] = [
    { tab: 'quizzes', label: 'Quizzes to take', value: quizzes === null ? '–' : quizzesToDo, hint: 'Open the Quizzes section', icon: QuizIcon },
    { tab: 'activities', label: 'Activities to do', value: learning.tasks === null ? '–' : open('ACTIVITY'), hint: 'Open Activities', icon: ClipboardCheckIcon },
    { tab: 'performance', label: 'Performance tasks to do', value: learning.tasks === null ? '–' : open('PERFORMANCE_TASK'), hint: 'Open Performance Tasks', icon: TargetIcon },
    { tab: 'grades', label: 'Graded work', value: learning.submissions === null ? '–' : graded, hint: 'Open My Grades', icon: ChartIcon },
  ];

  return (
    <section className="flex flex-col gap-8" aria-labelledby="overview-heading">
      <PageIntro
        id="overview-heading"
        eyebrow="Welcome back"
        title={`Kumusta, ${name.split(' ')[0] || 'student'}!`}
        description="Here is where you stand. Pick a section from the menu on the left to get to work."
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ tab, label, value, hint, icon: Icon }) => (
          <li key={tab}>
            <button type="button" onClick={() => onOpen(tab)} className="surface-interactive flex h-full w-full flex-col gap-3 p-5 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-display text-4xl font-semibold text-parchment">{value}</span>
              <span className="text-sm font-medium text-parchment">{label}</span>
              <span className="text-xs text-muted">{hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onOpen('lectures')} className="surface-interactive flex items-center gap-4 p-5 text-left">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-leaf/10 text-leaf">
          <BookIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-medium text-parchment">Lectures and vocabulary</span>
          <span className="block text-xs text-muted">Read your teacher’s lessons and explore Filipino words.</span>
        </span>
      </button>
    </section>
  );
}
