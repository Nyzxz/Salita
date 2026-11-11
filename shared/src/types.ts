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

/** Grade levels offered by the school: Grade 7 to Grade 12 only. */
export const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

/** Learning content is aimed at one grade level, or at every grade. */
export type ContentGrade = GradeLevel | 'ALL';

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

export interface QuizContentQuestion {
  /** Only sent to teachers (so they can edit a quiz); students never receive it. */
  correctAnswerIndex?: number;
  questionText: string;
  options: string[];
  points: number;
}

export interface QuizContent {
  id: string;
  title: string;
  description: string;
  timeLimitMinutes?: number;
  /** ISO time after which the quiz can no longer be started or submitted. */
  dueDate?: string;
  /** Questions and answer choices are shuffled differently for each attempt. */
  randomize: boolean;
  /** Set for a student when their teacher has unlocked a retake for them. */
  retakeOpen?: boolean;
  gradeLevel: ContentGrade;
  questions: QuizContentQuestion[];
  createdBy: string;
  createdAt: string;
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  gradeLevel: ContentGrade;
  timeLimitMinutes?: number;
  dueDate?: string;
  randomize?: boolean;
  questions: Array<QuizContentQuestion & { correctAnswerIndex: number }>;
}

/** Body of POST /api/quizzes/:id/retakes — unlock one more attempt for each listed student. */
export interface GrantRetakesRequest {
  studentIds: string[];
}

/** Editing a quiz replaces its settings and questions. */
export type UpdateQuizRequest = CreateQuizRequest;

/** One question as a student sees it when reviewing a finished attempt. */
export interface QuizReviewItem {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  /** -1 when the student left it blank. */
  userAnswer: number;
  points: number;
  earned: number;
}

/** Response of POST /api/quizzes/:id/start — the server's clock decides when a timed quiz ends. */
export interface QuizStartRecord {
  quizId: string;
  startedAt: string;
  /** ISO time the quiz closes, or absent for an untimed quiz. */
  expiresAt?: string;
}

export interface SubmitQuizAttemptRequest {
  userAnswers: number[];
}

export interface QuizAttemptRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  userAnswers: number[];
  scoreObtained: number;
  totalPossiblePoints: number;
  percentageScore: number;
  feedback: string;
  completedAt: string;
  /** Per-question review, sent only to the student who took it. */
  review?: QuizReviewItem[];
  /** Percentage points taken off this score because it was a retake (a random 1–5). */
  penaltyPercent?: number;
  /** Teacher's list only: this student currently has an unused retake unlocked. */
  retakeOpen?: boolean;
}

export interface LectureRecord {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  category: Category;
  historicalContext: string;
  etymologyOrigin?: string;
  gradeLevel: ContentGrade;
  createdAt: string;
}

export interface CreateLectureRequest {
  gradeLevel: ContentGrade;
  word: string;
  translation: string;
  phonetic: string;
  category: Category;
  historicalContext: string;
  etymologyOrigin?: string;
}

/** Editing a lecture replaces its fields. */
export type UpdateLectureRequest = CreateLectureRequest;

export interface CreateActivityTaskRequest {
  gradeLevel: ContentGrade;
  type: TaskType;
  title: string;
  description: string;
  totalPoints: number;
  dueDate: string;
}

/** Editing an activity or task replaces its fields (the type cannot change). */
export type UpdateActivityTaskRequest = Omit<CreateActivityTaskRequest, 'type'>;

/** Uniform envelope returned by every API endpoint. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  /** Present only when `success` is false. */
  error?: string;
  /** Present on paginated lists. */
  meta?: PageMeta;
}

/** Describes one page of a paginated list. */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export type UserRole = 'STUDENT' | 'TEACHER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  /** Students only: their grade level, e.g. "Grade 9". */
  section?: string;
  /** Students only: their class section within the grade, if the teacher set one. */
  classSection?: string;
  /** True until a student replaces the default password a teacher gave them. */
  mustChangePassword?: boolean;
  /** Chosen avatar colour preset; initials are drawn on it. Unset means the default. */
  avatar?: string;
}

/** Body of PUT /api/auth/me — a signed-in user editing their own profile. */
export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  /** An avatar preset id, or an empty string to go back to the default. */
  avatar?: string;
}

/** Body of POST /api/auth/me?action=password. Responds with a fresh AuthSession. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
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

// ---------------------------------------------------------------------------
// Admin: student accounts
// ---------------------------------------------------------------------------

/** A student account as the teacher's directory is allowed to see it (no password). */
export interface StudentAccount {
  id: string;
  fullName: string;
  username: string;
  email: string;
  section: string;
  /** Class section within the grade, like "Sampaguita" or "A". Optional. */
  classSection?: string;
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  /** True while the student still has the default password a teacher set. */
  mustChangePassword: boolean;
}

/** Body of POST /api/admin/students. */
export interface CreateStudentRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
  /** One of GRADE_LEVELS. */
  section: GradeLevel;
  /** Name of one of the teacher's sections for that grade. */
  classSection?: string;
}

/**
 * Body of PUT /api/admin/students/:id. All fields optional — send only what's
 * changing. Setting `password` resets it; setting `status` activates/deactivates.
 */
export interface UpdateStudentRequest {
  fullName?: string;
  email?: string;
  section?: GradeLevel;
  /** Empty string removes the student from their class section. */
  classSection?: string;
  status?: StudentAccount['status'];
  password?: string;
}

/** A class section within a grade, made by the teacher. */
export interface ClassSectionRecord {
  id: string;
  grade: GradeLevel;
  name: string;
}

// ---------------------------------------------------------------------------
// Activities & Performance Tasks
// ---------------------------------------------------------------------------

export type TaskType = 'ACTIVITY' | 'PERFORMANCE_TASK';

export interface ActivityTask {
  id: string;
  type: TaskType;
  gradeLevel: ContentGrade;
  title: string;
  description: string;
  totalPoints: number;
  /** ISO date string. */
  dueDate: string;
}

export interface SubmissionRecord {
  /** True when the student resubmitted after it was graded, so the old grade was cleared and needs a fresh look. */
  resubmitted?: boolean;
  id: string;
  taskId: string;
  studentId: string;
  studentName: string;
  submittedContent: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  status: 'PENDING' | 'GRADED';
  /** True when the work arrived after the task's due date. */
  late?: boolean;
  attachment?: AttachmentInfo;
}

export interface GradeSubmissionRequest {
  grade: number;
  feedback?: string;
  /** The `submittedAt` the teacher was looking at; if the student resubmitted since, saving is refused. */
  expectedSubmittedAt?: string;
}

/** A file attached to a submission. The bytes are fetched separately. */
export interface AttachmentInfo {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
}

/** Body of POST /api/submissions?route=attachment. */
export interface UploadAttachmentRequest {
  taskId: string;
  fileName: string;
  contentType: string;
  /** File bytes, base64-encoded. */
  dataBase64: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  /** In-app route to open when clicked. */
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationFeed {
  items: NotificationRecord[];
  unreadCount: number;
}

/** One row of a CSV import. The server picks the default password. */
export interface ImportStudentRow {
  fullName: string;
  username: string;
  email: string;
  section: GradeLevel;
  classSection?: string;
}

export interface ImportStudentResult {
  username: string;
  status: 'created' | 'skipped';
  /** Set when created: the default password to hand over. */
  password?: string;
  /** Set when skipped. */
  reason?: string;
}

export interface QuizQuestionAnalytics {
  questionText: string;
  /** Share of attempts (0–100) that answered correctly. */
  correctRate: number;
  /** How many attempts chose each of the four options. */
  optionCounts: number[];
  correctAnswerIndex: number;
  unanswered: number;
}

export interface QuizAnalyticsItem {
  quizId: string;
  title: string;
  gradeLevel: string;
  attempts: number;
  students: number;
  averagePercent: number;
  highestPercent: number;
  lowestPercent: number;
  questions: QuizQuestionAnalytics[];
}

export interface StudentProgressItem {
  studentId: string;
  studentName: string;
  section: string;
  classSection?: string;
  quizzesTaken: number;
  quizAveragePercent: number | null;
  tasksGraded: number;
  taskAveragePercent: number | null;
}

export interface TeacherAnalytics {
  quizzes: QuizAnalyticsItem[];
  students: StudentProgressItem[];
}

/** Body of POST /api/submissions. */
export interface CreateSubmissionRequest {
  taskId: string;
  content: string;
  /** Id returned by uploading a file for this task; attaches it to the submission. */
  attachmentId?: string;
}
