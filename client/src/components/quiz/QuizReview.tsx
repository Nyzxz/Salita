import type { QuizAttemptRecord } from '@shared/types';

/** Question-by-question review of a finished attempt: what was chosen and what was correct. */
export function QuizReview({ attempt }: { attempt: QuizAttemptRecord }) {
  if (!attempt.review?.length) return null;
  return (
    <section aria-label={`Review of ${attempt.quizTitle}`} className="text-left">
      <h4 className="text-base font-semibold text-parchment">Review your answers</h4>
      <ol className="mt-4 flex flex-col gap-5">
        {attempt.review.map((item, index) => {
          const isCorrect = item.userAnswer === item.correctAnswerIndex;
          return (
            <li key={`${index}-${item.questionText}`} className="rounded-xl border border-night-border bg-night-deep/40 p-4">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md text-xs font-bold ${isCorrect ? 'bg-leaf/15 text-leaf' : 'bg-clay/15 text-clay'}`}>
                  {index + 1}
                </span>
                <p className="flex-1 font-medium text-parchment">{item.questionText}</p>
                <span className={isCorrect ? 'badge-leaf' : 'badge-clay'}>{item.earned}/{item.points} pts</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {item.options.map((option, optionIndex) => {
                  const isAnswer = optionIndex === item.correctAnswerIndex;
                  const isChosen = optionIndex === item.userAnswer;
                  return (
                    <li
                      key={`${optionIndex}-${option}`}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                        isAnswer ? 'border-leaf/50 bg-leaf/10 text-parchment' : isChosen ? 'border-clay/50 bg-clay/10 text-parchment' : 'border-night-border text-muted'
                      }`}
                    >
                      <span>{option}</span>
                      <span className="flex-none text-xs">
                        {isAnswer && <span className="text-leaf">Correct answer</span>}
                        {isChosen && !isAnswer && <span className="text-clay">Your answer</span>}
                        {isChosen && isAnswer && <span className="ml-2 text-muted">· your answer</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {item.userAnswer < 0 && <p className="mt-2 text-xs text-clay">You left this blank.</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
