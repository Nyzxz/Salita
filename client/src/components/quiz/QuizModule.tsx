import { useEffect, useState } from 'react';
import { useQuiz } from '../../hooks/useQuiz';
import { useWords } from '../../hooks/useWords';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { Flashcard } from './Flashcard';

type Mode = 'flashcards' | 'quiz';

const MODES: { id: Mode; label: string }[] = [
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'quiz', label: 'Quiz' },
];

export function QuizModule() {
  const [mode, setMode] = useState<Mode>('flashcards');

  return (
    <section aria-labelledby="practice-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="practice-heading" className="font-display text-2xl font-semibold text-parchment">
          Practice
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Review with flashcards, then test yourself with a quick quiz.
        </p>
      </div>

      <div role="tablist" aria-label="Practice mode" className="flex gap-2">
        {MODES.map((item) => {
          const isActive = item.id === mode;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(item.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-gold bg-gold text-night'
                  : 'border-night-border text-muted hover:text-parchment'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {mode === 'flashcards' ? <FlashcardDeck /> : <MultipleChoiceQuiz />}
    </section>
  );
}

function FlashcardDeck() {
  const { data: words, isLoading, error } = useWords();
  const [index, setIndex] = useState(0);

  if (isLoading) return <LoadingState label="Loading flashcards…" />;
  if (error) return <ErrorState message={error} />;
  if (!words || words.length === 0) return null;

  const current = words[Math.min(index, words.length - 1)];

  return (
    <div className="flex flex-col items-center gap-4">
      <Flashcard key={current.id} word={current} />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-md border border-night-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-parchment disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-muted">
          {index + 1} / {words.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(words.length - 1, i + 1))}
          disabled={index === words.length - 1}
          className="rounded-md border border-night-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-parchment disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function MultipleChoiceQuiz() {
  const { data: questions, isLoading, error, reload } = useQuiz(8);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  // Reset local progress whenever a fresh set of questions arrives.
  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setScore(0);
  }, [questions]);

  if (isLoading) return <LoadingState label="Loading quiz…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!questions || questions.length === 0) return null;

  const isFinished = index >= questions.length;

  if (isFinished) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-night-border bg-night-panel p-8">
        <p className="font-display text-2xl font-semibold text-parchment">
          {score} / {questions.length} correct
        </p>
        <p className="text-sm text-muted">
          {score === questions.length
            ? 'Perfect round — salamat for playing!'
            : 'Review the flashcards for the ones that tripped you up, then try again.'}
        </p>
        <button
          type="button"
          onClick={reload}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90"
        >
          Play again
        </button>
      </div>
    );
  }

  const question = questions[index];
  const hasAnswered = selected !== null;

  const handleSelect = (choice: string) => {
    if (hasAnswered) return;
    setSelected(choice);
    if (choice === question.correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-night-border bg-night-panel p-6 sm:p-8">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        <span>
          Score: {score}/{index + (hasAnswered ? 1 : 0)}
        </span>
      </div>

      <p className="font-display text-2xl font-semibold text-parchment">{question.prompt}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.choices.map((choice) => {
          const isCorrectChoice = choice === question.correctAnswer;
          const isSelectedChoice = choice === selected;

          let stateClasses = 'border-night-border text-parchment hover:border-gold/50';
          if (hasAnswered && isCorrectChoice) {
            stateClasses = 'border-leaf bg-leaf/10 text-leaf';
          } else if (hasAnswered && isSelectedChoice) {
            stateClasses = 'border-clay bg-clay/10 text-clay';
          }

          return (
            <button
              key={choice}
              type="button"
              onClick={() => handleSelect(choice)}
              disabled={hasAnswered}
              className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${stateClasses}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {hasAnswered && (
        <div className="rounded-lg bg-night-raised p-4 text-sm text-muted">
          <p>
            <span
              className={`font-semibold ${
                selected === question.correctAnswer ? 'text-leaf' : 'text-clay'
              }`}
            >
              {selected === question.correctAnswer ? 'Correct. ' : 'Not quite. '}
            </span>
            {question.explanation}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-night transition-opacity hover:opacity-90"
          >
            {index === questions.length - 1 ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  );
}
