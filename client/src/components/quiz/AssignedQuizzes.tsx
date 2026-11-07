import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuizAttemptRecord, QuizContent } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMyQuizAttempts,
  fetchQuizzes,
  startQuiz,
  submitQuizAttempt,
} from '../../api/quizzes';
import { ApiRequestError } from '../../api/client';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { gradeLabel } from '../ui/GradeSelect';
import { Notice } from '../ui/Notice';
import { PageIntro } from '../ui/PageIntro';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, InboxIcon, QuizIcon } from '../common/icons';

export function AssignedQuizzes() {
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [quizzes, setQuizzes] = useState<QuizContent[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizContent | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [latestAttempt, setLatestAttempt] = useState<QuizAttemptRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  /** Server-decided closing time (ms since epoch) for a timed quiz. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const answersRef = useRef<number[]>([]);
  answersRef.current = answers;

  useEffect(() => {
    let active = true;
    Promise.all([fetchQuizzes(token), fetchMyQuizAttempts(token)])
      .then(([quizList, attemptList]) => {
        if (!active) return;
        setQuizzes(quizList);
        setAttempts(attemptList);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof ApiRequestError ? cause.message : 'Could not load quizzes.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const beginQuiz = async (quiz: QuizContent) => {
    setError(null);
    setIsStarting(true);
    try {
      // Tells the server the quiz is open; for timed quizzes this starts its clock.
      const started = await startQuiz(quiz.id, token);
      setDeadline(started.expiresAt ? new Date(started.expiresAt).getTime() : null);
      setSelectedQuiz(quiz);
      setAnswers(Array(quiz.questions.length).fill(-1) as number[]);
      setLatestAttempt(null);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not start this quiz.');
    } finally {
      setIsStarting(false);
    }
  };

  /** `force` is used when time runs out: unanswered questions are sent as blank (scored wrong). */
  const handleSubmit = useCallback(
    async (force = false) => {
      const current = answersRef.current;
      if (!selectedQuiz || (!force && current.some((answer) => answer < 0))) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const attempt = await submitQuizAttempt(selectedQuiz.id, { userAnswers: current }, token);
        setLatestAttempt(attempt);
        setAttempts((previous) => [attempt, ...previous]);
        setDeadline(null);
      } catch (cause) {
        setError(cause instanceof ApiRequestError ? cause.message : 'Could not submit this quiz.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedQuiz, token],
  );

  // Countdown for timed quizzes. The server enforces the limit; this just keeps the student informed
  // and submits what they have when time runs out.
  useEffect(() => {
    if (deadline === null || !selectedQuiz || latestAttempt) {
      setSecondsLeft(null);
      return;
    }
    let submitted = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !submitted) {
        submitted = true;
        void handleSubmit(true);
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadline, selectedQuiz, latestAttempt, handleSubmit]);

  if (isLoading) return <LoadingState label="Loading teacher quizzes…" />;
  if (error && quizzes.length === 0) return <ErrorState message={error} />;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="assigned-quizzes-heading">
      <PageIntro
        id="assigned-quizzes-heading"
        eyebrow="From your teacher"
        title="Teacher quizzes"
        description="Complete a quiz and your score will be saved to your account."
      />

      {error && <Notice tone="error">{error}</Notice>}

      {selectedQuiz && !latestAttempt ? (
        <div className="surface flex animate-fade-in flex-col gap-7 p-6 sm:p-8">
          <div>
            <button type="button" onClick={() => { setSelectedQuiz(null); setDeadline(null); }} className="btn-ghost btn-sm -ml-3 mb-3">
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to quizzes
            </button>
            <h3 className="text-2xl font-semibold text-parchment">{selectedQuiz.title}</h3>
            <p className="mt-2 text-sm text-muted">{selectedQuiz.description}</p>
            {selectedQuiz.timeLimitMinutes && (
              <p
                role="timer"
                aria-live="off"
                className={`mt-3 ${secondsLeft !== null && secondsLeft <= 60 ? 'badge-clay' : 'badge-neutral'}`}
              >
                <ClockIcon className="h-3 w-3" />
                {secondsLeft === null
                  ? `${selectedQuiz.timeLimitMinutes} minute limit`
                  : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} left`}
              </p>
            )}
          </div>

          {selectedQuiz.questions.map((question, questionIndex) => (
            <fieldset key={`${questionIndex}-${question.questionText}`} className="flex flex-col gap-3">
              <legend className="mb-3 flex w-full items-start gap-3 font-medium text-parchment">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-gold/15 text-xs font-bold text-gold">{questionIndex + 1}</span>
                <span className="flex-1">{question.questionText}</span>
                <span className="badge-neutral flex-none">{question.points} pts</span>
              </legend>
              {question.options.map((option, optionIndex) => (
                <label
                  key={`${optionIndex}-${option}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition duration-150 ${
                    answers[questionIndex] === optionIndex
                      ? 'border-gold bg-gold/10 text-parchment shadow-[0_0_0_3px_rgba(232,169,60,0.1)]'
                      : 'border-night-border bg-night-deep/40 text-muted hover:border-gold/40 hover:text-parchment'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={optionIndex}
                    checked={answers[questionIndex] === optionIndex}
                    onChange={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))}
                    className="accent-gold"
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}

          <button
            type="button"
            disabled={isSubmitting || answers.some((answer) => answer < 0)}
            onClick={() => void handleSubmit()}
            className="btn-primary self-start"
          >
            {isSubmitting ? 'Submitting…' : 'Submit quiz'}
          </button>
        </div>
      ) : latestAttempt ? (
        <div className="surface animate-scale-in p-8 text-center sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-leaf/15 text-leaf">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-parchment">Quiz submitted</h3>
          <p className="mt-3 font-display text-5xl font-semibold text-gradient-gold">{latestAttempt.percentageScore}%</p>
          <p className="mt-2 text-sm text-muted">
            {latestAttempt.scoreObtained} / {latestAttempt.totalPossiblePoints} points
          </p>
          {latestAttempt.feedback && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">{latestAttempt.feedback}</p>}
          <button type="button" onClick={() => setSelectedQuiz(null)} className="btn-secondary mt-6">
            Return to quizzes
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={<QuizIcon />} title="No quizzes yet" description="When your teacher publishes a quiz, it will appear here." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quizzes.map((quiz) => {
            const previousAttempts = attempts.filter((attempt) => attempt.quizId === quiz.id);
            const previous = previousAttempts[0];
            return (
              <li key={quiz.id} className="surface-interactive flex flex-col p-6">
                <h3 className="text-lg font-semibold text-parchment">{quiz.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{quiz.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge-gold">{gradeLabel(quiz.gradeLevel)}</span>
                  <span className="badge-neutral">{quiz.questions.length} questions</span>
                  {quiz.timeLimitMinutes ? <span className="badge-neutral"><ClockIcon className="h-3 w-3" />{quiz.timeLimitMinutes} min</span> : null}
                  {previous ? <span className="badge-leaf">Last score {previous.percentageScore}%</span> : null}
                </div>
                <button type="button" onClick={() => void beginQuiz(quiz)} disabled={isStarting} className="btn-primary btn-sm mt-5 self-start">
                  {previous ? 'Retake quiz' : 'Start quiz'}
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <h3 className="mb-4 text-lg font-semibold text-parchment">Attempt history</h3>
        {attempts.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title="No attempts yet" description="Your completed quizzes will appear here." />
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Quiz</th><th>Score</th><th>Completed</th></tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="font-medium text-parchment">{attempt.quizTitle}</td>
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
  );
}
