/** Mirrors server/src/limits.ts — the server is the real gate; these keep inputs honest. */
export const LIMITS = {
  submission: 10_000,
  feedback: 2_000,
  short: 200,
  question: 500,
  option: 300,
  long: 5_000,
  quizQuestions: 100,
  points: 1_000,
} as const;
