import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDateTime } from '../../lib/dates';
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
import { QuizReview } from './QuizReview';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, QuizIcon } from '../common/icons';

interface QuestionLayout {
  /** Index of the question in the quiz as the teacher wrote it. */
  questionIndex: number;
  /** Original option indexes, in the order this student sees them. */
  optionOrder: number[];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * How one student sees the quiz. Answers are always stored against the teacher's original
 * question and option numbers, so shuffling never changes how the quiz is scored.
 */
function buildLayout(quiz: QuizContent): QuestionLayout[] {
  const layout = quiz.questions.map((question, questionIndex) => ({
    questionIndex,
    optionOrder: question.options.map((_, optionIndex) => optionIndex),
  }));
  if (!quiz.randomize) return layout;
  return shuffle(layout).map((entry) => ({ ...entry, optionOrder: shuffle(entry.optionOrder) }));
}

interface QuizDraft {
  answers: number[];
  flagged: number[];
  layout: QuestionLayout[];
}

/** Answers are kept in this browser while a quiz is open, so a refresh doesn't lose them. */
function draftKey(userId: string, quizId: string): string {
  return `salita.quizdraft.${userId}.${quizId}`;
}
function loadQuizDraft(userId: string, quiz: QuizContent): QuizDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(userId, quiz.id));
    if (!raw) return null;
    const draft = JSON.parse(raw) as QuizDraft;
    const count = quiz.questions.length;
    const valid =
      Array.isArray(draft.answers) && draft.answers.length === count && Array.isArray(draft.layout) && draft.layout.length === count &&
      draft.layout.every((entry) => Number.isInteger(entry.questionIndex) && entry.questionIndex >= 0 && entry.questionIndex < count &&
        Array.isArray(entry.optionOrder) && entry.optionOrder.length === quiz.questions[entry.questionIndex].options.length);
    return valid ? { answers: draft.answers, flagged: Array.isArray(draft.flagged) ? draft.flagged : [], layout: draft.layout } : null;
  } catch {
    return null;
  }
}
function saveQuizDraft(userId: string, quizId: string, draft: QuizDraft | null): void {
  try {
    if (draft) window.localStorage.setItem(draftKey(userId, quizId), JSON.stringify(draft));
    else window.localStorage.removeItem(draftKey(userId, quizId));
  } catch {
    /* drafts are a convenience only */
  }
}
function hasQuizDraft(userId: string, quizId: string): boolean {
  try {
    return window.localStorage.getItem(draftKey(userId, quizId)) !== null;
  } catch {
    return false;
  }
}

export function AssignedQuizzes() {
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [quizzes, setQuizzes] = useState<QuizContent[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizContent | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [layout, setLayout] = useState<QuestionLayout[]>([]);
  const [flagged, setFlagged] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const userId = session?.user.id ?? '';
  const [latestAttempt, setLatestAttempt] = useState<QuizAttemptRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [reviewing, setReviewing] = useState<QuizAttemptRecord | null>(null);
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
      // The server keeps the original clock for a quiz that is still running, so picking up
      // where the student left off (after a refresh) is safe.
      const draft = loadQuizDraft(userId, quiz);
      setAnswers(draft?.answers ?? (Array(quiz.questions.length).fill(-1) as number[]));
      setLayout(draft?.layout ?? buildLayout(quiz));
      setFlagged(draft?.flagged ?? []);
      setConfirming(false);
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
        saveQuizDraft(userId, selectedQuiz.id, null);
        setLatestAttempt(attempt);
        setAttempts((previous) => [attempt, ...previous]);
        // A used-up retake is gone; the quiz list shows it as completed again.
        setQuizzes((previous) => previous.map((quiz) => (quiz.id === attempt.quizId ? { ...quiz, retakeOpen: false } : quiz)));
        setDeadline(null);
      } catch (cause) {
        setError(cause instanceof ApiRequestError ? cause.message : 'Could not submit this quiz.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedQuiz, token, userId],
  );

  // Save answers as they change.
  useEffect(() => {
    if (selectedQuiz && !latestAttempt && layout.length > 0) saveQuizDraft(userId, selectedQuiz.id, { answers, flagged, layout });
  }, [answers, flagged, layout, selectedQuiz, latestAttempt, userId]);

  const toggleFlag = (questionIndex: number) =>
    setFlagged((current) => (current.includes(questionIndex) ? current.filter((value) => value !== questionIndex) : [...current, questionIndex]));

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
                className={`sticky top-20 z-20 mt-3 shadow-lg ${secondsLeft !== null && secondsLeft <= 60 ? 'badge-clay' : 'badge-gold'}`}
              >
                <ClockIcon className="h-3 w-3" />
                {secondsLeft === null
                  ? `${selectedQuiz.timeLimitMinutes} minute limit`
                  : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} left`}
              </p>
            )}
          </div>

          {layout.map(({ questionIndex, optionOrder }, position) => {
            const question = selectedQuiz.questions[questionIndex];
            return (
              <fieldset key={questionIndex} className="flex flex-col gap-3">
                <legend className="mb-3 flex w-full items-start gap-3 font-medium text-parchment">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-gold/15 text-xs font-bold text-gold">{position + 1}</span>
                  <span className="flex-1">{question.questionText}</span>
                  <span className="badge-neutral flex-none">{question.points} pts</span>
                  <button
                    type="button"
                    onClick={() => toggleFlag(questionIndex)}
                    aria-pressed={flagged.includes(questionIndex)}
                    className={`flex-none rounded-md border px-2 py-0.5 text-xs transition ${flagged.includes(questionIndex) ? 'border-gold bg-gold/15 text-gold' : 'border-night-border text-muted hover:text-parchment'}`}
                  >
                    {flagged.includes(questionIndex) ? '⚑ Flagged' : '⚐ Flag'}
                  </button>
                </legend>
                {optionOrder.map((optionIndex) => (
                  <label
                    key={optionIndex}
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
                    {question.options[optionIndex]}
                  </label>
                ))}
              </fieldset>
            );
          })}

          {confirming ? (
            <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5" role="region" aria-label="Check your answers before submitting">
              <h4 className="text-lg font-semibold text-parchment">Check your answers</h4>
              <p className="mt-1 text-sm text-muted">
                {answers.filter((answer) => answer >= 0).length} of {answers.length} answered
                {flagged.length > 0 ? ` · ${flagged.length} flagged` : ''}. You can’t change them after you submit.
              </p>
              <ol className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8">
                {layout.map(({ questionIndex }, position) => {
                  const answered = answers[questionIndex] >= 0;
                  return (
                    <li key={questionIndex}>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirming(false);
                          window.setTimeout(() => document.getElementsByName(`question-${questionIndex}`)[0]?.scrollIntoView({ block: 'center' }), 50);
                        }}
                        aria-label={`Question ${position + 1}: ${answered ? 'answered' : 'not answered'}${flagged.includes(questionIndex) ? ', flagged' : ''}`}
                        className={`relative w-full rounded-lg border py-2 text-sm font-semibold ${answered ? 'border-leaf/50 bg-leaf/10 text-leaf' : 'border-clay/50 bg-clay/10 text-clay'}`}
                      >
                        {position + 1}
                        {flagged.includes(questionIndex) && <span className="absolute -right-1 -top-1 text-xs text-gold">⚑</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>Keep working</button>
                <button type="button" disabled={isSubmitting} onClick={() => void handleSubmit(true)} className="btn-primary">
                  {isSubmitting ? 'Submitting…' : 'Submit quiz'}
                </button>
              </div>
              {answers.some((answer) => answer < 0) && (
                <p className="mt-3 text-xs text-clay">Unanswered questions will count as wrong.</p>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="btn-primary self-start">
              Review and submit
            </button>
          )}
        </div>
      ) : latestAttempt ? (
        <div className="surface animate-scale-in p-8 text-center sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-leaf/15 text-leaf">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-parchment">Quiz submitted</h3>
          <p className="mt-1 text-xs text-muted">Your answers are reviewed below. Your teacher can open a retake if you need one.</p>
          <p className="mt-3 font-display text-5xl font-semibold text-gradient-gold">{latestAttempt.percentageScore}%</p>
          <p className="mt-2 text-sm text-muted">
            {latestAttempt.scoreObtained} / {latestAttempt.totalPossiblePoints} points
          </p>
          {latestAttempt.penaltyPercent ? (
            <p className="mt-2 text-xs text-muted">Retake: {latestAttempt.penaltyPercent}% was taken off this score.</p>
          ) : null}
          {latestAttempt.feedback && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">{latestAttempt.feedback}</p>}
          <button type="button" onClick={() => setSelectedQuiz(null)} className="btn-secondary mt-6">
            Return to quizzes
          </button>
          {latestAttempt.review && (
            <div className="mt-8 border-t border-night-border pt-6">
              <QuizReview attempt={latestAttempt} />
            </div>
          )}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={<QuizIcon />} title="No quizzes yet" description="When your teacher publishes a quiz, it will appear here." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quizzes.map((quiz) => {
            const previousAttempts = attempts.filter((attempt) => attempt.quizId === quiz.id);
            const previous = previousAttempts[0];
            const isClosed = quiz.dueDate ? new Date(quiz.dueDate).getTime() < Date.now() : false;
            const isDone = previousAttempts.length > 0 && !quiz.retakeOpen;
            const isBlocked = isClosed || isDone;
            return (
              <li key={quiz.id} className="surface-interactive flex flex-col p-6">
                <h3 className="text-lg font-semibold text-parchment">{quiz.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{quiz.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge-gold">{gradeLabel(quiz.gradeLevel)}</span>
                  <span className="badge-neutral">{quiz.questions.length} questions</span>
                  <span className="badge-neutral"><ClockIcon className="h-3 w-3" />{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : 'No time limit'}</span>
                  {previous ? <span className="badge-leaf">Last score {previous.percentageScore}%</span> : null}
                  {quiz.dueDate ? (
                    <span className={isClosed ? 'badge-clay' : 'badge-neutral'}>
                      {isClosed ? 'Closed' : 'Due'} {formatDateTime(quiz.dueDate)}
                    </span>
                  ) : (
                    <span className="badge-neutral">No closing date</span>
                  )}
                  {quiz.retakeOpen ? <span className="badge-gold">Retake unlocked · 1–5% comes off your score</span> : null}
                  {isDone ? <span className="badge-neutral">Completed</span> : null}
                </div>
                {isDone && previous ? (
                  <button type="button" onClick={() => setReviewing(previous)} className="btn-secondary btn-sm mt-5 self-start">
                    Review my answers
                  </button>
                ) : (
                  <button type="button" onClick={() => void beginQuiz(quiz)} disabled={isStarting || isBlocked} className="btn-primary btn-sm mt-5 self-start">
                    {isClosed ? 'Quiz closed' : hasQuizDraft(userId, quiz.id) ? 'Resume quiz' : quiz.retakeOpen ? 'Start retake' : 'Start quiz'}
                    {!isBlocked && <ArrowRightIcon className="h-3.5 w-3.5" />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {reviewing && (
        <div className="surface animate-fade-in p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-parchment">{reviewing.quizTitle} — your answers</h3>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setReviewing(null)}>Close</button>
          </div>
          <QuizReview attempt={reviewing} />
        </div>
      )}
    </section>
  );
}
