import type { Achievements, Badge } from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { DIFFICULTY_NAMES, PASSING_PERCENT, QUIZ_DIFFICULTIES } from '../difficulty.js';
import { matchesGrade } from '../grades.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Submission } from '../models/Submission.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days are counted in Philippine time (UTC+8), where the school is. */
const dayNumber = (date: Date): number => Math.floor((date.getTime() + 8 * 60 * 60 * 1000) / DAY_MS);

export function computeStreaks(days: Iterable<number>, today: number): { current: number; longest: number; activeToday: boolean } {
  const set = new Set(days);
  const sorted = [...set].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  // The streak is still alive if the last activity was today or yesterday.
  let cursor = set.has(today) ? today : today - 1;
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor -= 1;
  }
  return { current, longest, activeToday: set.has(today) };
}

export async function getAchievements(student: { id: string; section?: string }): Promise<Achievements> {
  await connectDB();
  const [attempts, submissions, quizzes] = await Promise.all([
    QuizAttempt.find({ studentId: student.id }).select('quizId percentageScore completedAt').limit(2000).lean(),
    Submission.find({ studentId: student.id }).select('submittedAt').limit(2000).lean(),
    Quiz.find().select('gradeLevel difficulty').lean(),
  ]);
  const days = [...attempts.map((a) => dayNumber(new Date(a.completedAt))), ...submissions.map((s) => dayNumber(new Date(s.submittedAt)))];
  const streak = computeStreaks(days, dayNumber(new Date()));

  const best = new Map<string, number>();
  for (const attempt of attempts) best.set(String(attempt.quizId), Math.max(best.get(String(attempt.quizId)) ?? 0, attempt.percentageScore));

  const badges: Badge[] = [
    { id: 'first-quiz', title: 'First steps', description: 'Finish your first quiz.', earned: attempts.length > 0 },
    { id: 'first-work', title: 'Hands on', description: 'Submit your first activity or performance task.', earned: submissions.length > 0 },
    { id: 'perfect', title: 'Perpekto!', description: 'Score 100% on a quiz.', earned: attempts.some((a) => a.percentageScore >= 100) },
    { id: 'streak-3', title: 'Three in a row', description: 'Be active 3 days in a row.', earned: streak.longest >= 3 },
    { id: 'streak-7', title: 'Linggong lakas', description: 'Be active 7 days in a row.', earned: streak.longest >= 7 },
  ];
  for (const difficulty of QUIZ_DIFFICULTIES) {
    const inTier = quizzes.filter((quiz) => quiz.difficulty === difficulty && matchesGrade(quiz.gradeLevel, student.section));
    badges.push({
      id: `tier-${difficulty.toLowerCase()}`,
      title: `${DIFFICULTY_NAMES[difficulty]} cleared`,
      description: `Pass every ${DIFFICULTY_NAMES[difficulty]} quiz for your grade (${PASSING_PERCENT}%+).`,
      earned: inTier.length > 0 && inTier.every((quiz) => (best.get(String(quiz._id)) ?? -1) >= PASSING_PERCENT),
    });
  }
  return { currentStreak: streak.current, longestStreak: streak.longest, activeToday: streak.activeToday, badges };
}
