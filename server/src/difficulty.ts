/** Difficulty tiers (mirrors shared/src/types.ts, which the server can only import types from). */
export const QUIZ_DIFFICULTIES = ['EASY', 'MEDIUM', 'INTERMEDIATE', 'HARD'] as const;
export type Difficulty = (typeof QUIZ_DIFFICULTIES)[number];
export const PASSING_PERCENT = 70;

export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  INTERMEDIATE: 'Intermediate',
  HARD: 'Hard',
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (QUIZ_DIFFICULTIES as readonly string[]).includes(value);
}
