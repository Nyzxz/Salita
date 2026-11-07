/**
 * Maximum lengths for user-supplied text. Enforced in every request parser (so
 * Vercel and Express behave the same) and mirrored in the Mongoose models and
 * in client/src/lib/limits.ts for the form inputs.
 */
export const LIMITS = {
  /** Student answer to an activity or performance task. */
  submission: 10_000,
  /** Teacher feedback on a graded submission. */
  feedback: 2_000,
  /** Words, titles, phonetics, origin tags, and similar one-liners. */
  short: 200,
  /** Question prompts. */
  question: 500,
  /** Quiz answer options. */
  option: 300,
  /** Cultural notes, task instructions, and descriptions. */
  long: 5_000,
  /** Most questions a single quiz may hold. */
  quizQuestions: 100,
  /** Largest point value for a single question or task. */
  points: 1_000,
} as const;

export function withinLimit(value: string, max: number): boolean {
  return value.length <= max;
}
