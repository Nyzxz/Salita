/**
 * Shared type contracts for the Filipino Language & Culture Explorer.
 *
 * These types are the single source of truth for the shape of data that
 * flows between the Express API and the React client. Import them with
 * the `@shared/*` alias from either workspace instead of redefining
 * copies locally.
 */

/** The four vocabulary groupings surfaced in the explorer's category tabs. */
export const VALID_CATEGORIES = ['greetings', 'food', 'values', 'phrases'] as const;

/** A vocabulary card's category. Derived from {@link VALID_CATEGORIES} so the
 * union type and the runtime validation list can never drift apart. */
export type Category = (typeof VALID_CATEGORIES)[number];

/** Display metadata for a category tab, kept alongside the id it describes. */
export interface CategoryMeta {
  id: Category;
  label: string;
  description: string;
}

export const CATEGORY_META: readonly CategoryMeta[] = [
  {
    id: 'greetings',
    label: 'Greetings',
    description: 'How Filipinos say hello, goodbye, and show respect.',
  },
  {
    id: 'food',
    label: 'Food & Dining',
    description: 'Words you will hear at the table and the market.',
  },
  {
    id: 'values',
    label: 'Cultural Values',
    description: 'Concepts with no single-word English equivalent.',
  },
  {
    id: 'phrases',
    label: 'Everyday Phrases',
    description: 'Small phrases that carry big cultural context.',
  },
];

/** A single vocabulary entry: one Filipino word or phrase plus its context. */
export interface WordItem {
  id: string;
  word: string;
  translation: string;
  /** A simplified, non-IPA pronunciation guide, e.g. "sah-lah-MAT". */
  phonetic: string;
  category: Category;
  /** The story or cultural setting in which this word is used. */
  historicalContext: string;
  /** Where the word came from, if it entered Tagalog from another language. */
  etymologyOrigin?: string;
  /** Reserved for future audio playback; the UI shows a disabled state without it. */
  audioUrl?: string;
}

/** A point on the Filipino language history timeline. */
export interface LanguageMilestone {
  id: string;
  /** Rough date range shown on the timeline axis, e.g. "Pre-1521". */
  era: string;
  title: string;
  description: string;
  /** Word ids (see {@link WordItem.id}) most associated with this era, if any. */
  keyWordsIntroduced: string[];
}

/** A single flashcard/multiple-choice question generated from a {@link WordItem}. */
export interface QuizQuestion {
  id: string;
  /** The WordItem this question tests, so the UI can link back for review. */
  wordId: string;
  /** The Filipino word or phrase shown as the prompt. */
  prompt: string;
  /** Answer options shown to the learner, including the correct one, pre-shuffled. */
  choices: string[];
  correctAnswer: string;
  /** Shown after answering, regardless of correctness. */
  explanation: string;
}

/** Uniform envelope returned by every API endpoint. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  /** Present only when `success` is false. */
  error?: string;
}

export type UserRole = 'STUDENT' | 'TEACHER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
