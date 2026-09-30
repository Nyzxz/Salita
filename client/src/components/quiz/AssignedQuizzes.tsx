import { useEffect, useState } from 'react';
import type { QuizAttemptRecord, QuizContent } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMyQuizAttempts,
  fetchQuizzes,
  submitQuizAttempt,
} from '../../api/quizzes';
import { ApiRequestError } from '../../api/client';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';

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

  const beginQuiz = (quiz: QuizContent) => {
    setSelectedQuiz(quiz);
    setAnswers(Array(quiz.questions.length).fill(-1) as number[]);
    setLatestAttempt(null);
  };

  const handleSubmit = async () => {
    if (!selectedQuiz || answers.some((answer) => answer < 0)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const attempt = await submitQuizAttempt(selectedQuiz.id, { userAnswers: answers }, token);
      setLatestAttempt(attempt);
      setAttempts((current) => [attempt, ...current]);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not submit this quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState label="Loading teacher quizzes…" />;
  if (error && quizzes.length === 0) return <ErrorState message={error} />;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="assigned-quizzes-heading">
      <div>
        <h2 id="assigned-quizzes-heading" className="font-display text-2xl font-semibold text-parchment">
          Teacher quizzes
        </h2>
        <p className="mt-1 text-sm text-muted">Complete a quiz and your score will be saved to your account.</p>
      </div>

      {error && <p role="alert" className="text-sm text-clay">{error}</p>}

      {selectedQuiz && !latestAttempt ? (
        <div className="flex flex-col gap-6 rounded-xl border border-night-border bg-night-panel p-6 sm:p-8">
          <div>
            <button type="button" onClick={() => setSelectedQuiz(null)} className="mb-4 text-sm text-gold hover:underline">
              Back to quizzes
            </button>
            <h3 className="font-display text-2xl font-semibold text-parchment">{selectedQuiz.title}</h3>
            <p className="mt-2 text-sm text-muted">{selectedQuiz.description}</p>
            {selectedQuiz.timeLimitMinutes && (
              <p className="mt-2 text-xs text-muted">Time limit: {selectedQuiz.timeLimitMinutes} minutes</p>
            )}
          </div>

          {selectedQuiz.questions.map((question, questionIndex) => (
            <fieldset key={`${questionIndex}-${question.questionText}`} className="flex flex-col gap-3">
              <legend className="mb-3 font-medium text-parchment">
                {questionIndex + 1}. {question.questionText}
                <span className="ml-2 text-xs text-muted">{question.points} pts</span>
              </legend>
              {question.options.map((option, optionIndex) => (
                <label
                  key={`${optionIndex}-${option}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                    answers[questionIndex] === optionIndex
                      ? 'border-gold bg-gold/10 text-parchment'
                      : 'border-night-border text-muted hover:border-gold/50'
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
            className="self-start rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-night disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting…' : 'Submit quiz'}
          </button>
        </div>
      ) : latestAttempt ? (
        <div className="rounded-xl border border-night-border bg-night-panel p-6">
          <h3 className="font-display text-xl font-semibold text-parchment">Quiz submitted</h3>
          <p className="mt-2 text-lg text-gold">
            {latestAttempt.scoreObtained} / {latestAttempt.totalPossiblePoints} points ({latestAttempt.percentageScore}%)
          </p>
          <p className="mt-2 text-sm text-muted">{latestAttempt.feedback}</p>
          <button type="button" onClick={() => setSelectedQuiz(null)} className="mt-4 text-sm text-gold hover:underline">
            Return to quizzes
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <p className="rounded-xl border border-night-border bg-night-panel p-6 text-sm text-muted">No quizzes have been published yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quizzes.map((quiz) => {
            const previousAttempts = attempts.filter((attempt) => attempt.quizId === quiz.id);
            const previous = previousAttempts[0];
            return (
              <li key={quiz.id} className="flex flex-col rounded-xl border border-night-border bg-night-panel p-5">
                <h3 className="font-display text-lg font-semibold text-parchment">{quiz.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{quiz.description}</p>
                <p className="mt-3 text-xs text-muted">
                  {quiz.questions.length} questions{quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ''}
                  {previous ? ` · Last score ${previous.percentageScore}%` : ''}
                </p>
                <button type="button" onClick={() => beginQuiz(quiz)} className="mt-4 self-start text-sm font-medium text-gold hover:underline">
                  {previous ? 'Retake quiz' : 'Start quiz'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold text-parchment">Attempt history</h3>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted">Your completed quizzes will appear here.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-night-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-night-panel text-xs uppercase text-muted">
                <tr><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Completed</th></tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="border-t border-night-border text-parchment">
                    <td className="px-4 py-3">{attempt.quizTitle}</td>
                    <td className="px-4 py-3">{attempt.scoreObtained}/{attempt.totalPossiblePoints} ({attempt.percentageScore}%)</td>
                    <td className="px-4 py-3 text-muted">{new Date(attempt.completedAt).toLocaleString()}</td>
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