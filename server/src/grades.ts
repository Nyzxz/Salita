/**
 * Grade-level rules shared by the content and student services. These mirror
 * GRADE_LEVELS / ContentGrade in shared/src/types.ts — the server only imports
 * *types* from shared (see README), so the runtime values live here too.
 */
import type { ContentGrade, GradeLevel } from '../../shared/src/types.js';

export const GRADE_LEVELS: readonly GradeLevel[] = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && (GRADE_LEVELS as readonly string[]).includes(value);
}

export function parseContentGrade(value: unknown): ContentGrade | null {
  if (value === 'ALL') return 'ALL';
  return isGradeLevel(value) ? value : null;
}

/**
 * Whether a student in `section` (e.g. "Grade 10" or "Grade 10 - Rizal") should
 * see content aimed at `contentGrade`. Content with no grade is treated as "all".
 */
export function matchesGrade(contentGrade: string | undefined, section: string | undefined): boolean {
  if (!contentGrade || contentGrade === 'ALL') return true;
  if (!section) return false;
  // "Grade 1" must not match "Grade 10", so require a non-digit (or end) after the label.
  return section.startsWith(contentGrade) && !/\d/.test(section.charAt(contentGrade.length));
}
