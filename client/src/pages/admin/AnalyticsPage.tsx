import { useEffect, useMemo, useState } from 'react';
import type { QuizAnalyticsItem, StudentProgressItem, TeacherAnalytics } from '@shared/types';
import { fetchTeacherAnalytics } from '../../api/quizzes';
import { downloadGradebook } from '../../api/admin';
import { ApiRequestError, saveBlob } from '../../api/client';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { BackLink } from '../../components/layout/BackLink';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { ChartIcon, DownloadIcon } from '../../components/common/icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { gradeLabel } from '../../components/ui/GradeSelect';

const tone = (percent: number): string => (percent >= 75 ? 'bg-leaf' : percent >= 50 ? 'bg-gold' : 'bg-clay');
const badge = (percent: number): string => (percent >= 75 ? 'badge-leaf' : percent >= 50 ? 'badge-gold' : 'badge-clay');

function Bar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-night-deep" role="img" aria-label={label}>
      <div className={`h-full rounded-full ${tone(percent)}`} style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

function QuizCard({ quiz }: { quiz: QuizAnalyticsItem }) {
  const [open, setOpen] = useState(false);
  // The hardest questions first, so the teacher sees what to reteach.
  const questions = useMemo(() => [...quiz.questions].sort((a, b) => a.correctRate - b.correctRate), [quiz.questions]);
  return (
    <li className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-parchment">{quiz.title}</h3>
          <p className="mt-1 text-xs text-muted">
            {gradeLabel(quiz.gradeLevel as never)} · {quiz.attempts} attempt{quiz.attempts === 1 ? '' : 's'} by {quiz.students} student{quiz.students === 1 ? '' : 's'}
          </p>
        </div>
        <span className={badge(quiz.averagePercent)}>Class average {quiz.averagePercent}%</span>
      </div>
      <div className="mt-4"><Bar percent={quiz.averagePercent} label={`Class average ${quiz.averagePercent} percent`} /></div>
      <p className="mt-2 text-xs text-muted">Lowest {quiz.lowestPercent}% · Highest {quiz.highestPercent}%</p>

      {questions.length > 0 && (
        <>
          <button type="button" className="btn-ghost btn-sm mt-3 -ml-3" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide question analysis' : 'Question analysis'}
          </button>
          {open && (
            <ol className="mt-3 flex flex-col gap-4">
              {questions.map((question, index) => (
                <li key={`${index}-${question.questionText}`} className="rounded-xl border border-night-border bg-night-deep/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-parchment">{question.questionText}</p>
                    <span className={`${badge(question.correctRate)} flex-none`}>{question.correctRate}% correct</span>
                  </div>
                  <ul className="mt-3 grid gap-1.5 text-xs text-muted sm:grid-cols-2">
                    {question.optionCounts.map((count, optionIndex) => (
                      <li key={optionIndex} className={optionIndex === question.correctAnswerIndex ? 'text-leaf' : ''}>
                        Option {String.fromCharCode(65 + optionIndex)}: {count} chose it{optionIndex === question.correctAnswerIndex ? ' (correct)' : ''}
                      </li>
                    ))}
                    {question.unanswered > 0 && <li>Left blank: {question.unanswered}</li>}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </li>
  );
}

function StudentTable({ students }: { students: StudentProgressItem[] }) {
  const cell = (value: number | null) => (value === null ? <span className="text-muted">—</span> : <span className={badge(value)}>{value}%</span>);
  return (
    <div className="table-wrap overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr><th>Student</th><th>Grade</th><th>Quizzes taken</th><th>Quiz average</th><th>Tasks graded</th><th>Task average</th></tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.studentId}>
              <td className="font-medium text-parchment">{student.studentName}</td>
              <td className="text-muted">{student.section || '—'}</td>
              <td className="text-muted">{student.quizzesTaken}</td>
              <td>{cell(student.quizAveragePercent)}</td>
              <td className="text-muted">{student.tasksGraded}</td>
              <td>{cell(student.taskAveragePercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<TeacherAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const load = () => {
    setError(null);
    fetchTeacherAnalytics()
      .then(setData)
      .catch((cause: unknown) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not load analytics.'));
  };
  useEffect(load, []);

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      saveBlob(await downloadGradebook(), 'salita-gradebook.csv');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not export the gradebook.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardShell
      eyebrow="Teacher workspace"
      title="Class analytics"
      subtitle="See how the class is doing, which questions they miss most, and who may need help."
      actions={
        <>
          <BackLink />
          <button type="button" className="btn-secondary btn-sm" disabled={isExporting} onClick={() => void exportCsv()}>
            <DownloadIcon className="h-3.5 w-3.5" /> {isExporting ? 'Preparing…' : 'Export gradebook (CSV)'}
          </button>
        </>
      }
    >
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !data && <LoadingState label="Crunching the numbers…" />}
      {data && (
        <div className="flex flex-col gap-12">
          <section aria-labelledby="quiz-analytics-heading">
            <h2 id="quiz-analytics-heading" className="text-xl font-semibold text-parchment">Quizzes</h2>
            <p className="mt-1 text-sm text-muted">Lowest class average first, so the trickiest material is at the top.</p>
            <div className="mt-5">
              {data.quizzes.length === 0 ? (
                <EmptyState icon={<ChartIcon />} title="No quiz attempts yet" description="Analysis appears once students complete a quiz." />
              ) : (
                <ul className="grid gap-4 lg:grid-cols-2">{data.quizzes.map((quiz) => <QuizCard key={quiz.quizId} quiz={quiz} />)}</ul>
              )}
            </div>
          </section>

          <section aria-labelledby="student-progress-heading">
            <h2 id="student-progress-heading" className="text-xl font-semibold text-parchment">Student progress</h2>
            <p className="mt-1 text-sm text-muted">Averages across each student’s quiz attempts and graded tasks.</p>
            <div className="mt-5">
              {data.students.length === 0 ? (
                <EmptyState icon={<ChartIcon />} title="No students yet" description="Add students in User management." />
              ) : (
                <StudentTable students={data.students} />
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
