import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { formatDateTime, timeZoneName } from '../../lib/dates';
import {
  DIFFICULTY_LABELS,
  QUIZ_DIFFICULTIES,
  VALID_CATEGORIES,
  type ActivityTask,
  type BulkContentAction,
  type QuestionBankItemRecord,
  type RubricCriterion,
  type Category,
  type ContentGrade,
  type CreateActivityTaskRequest,
  type CreateLectureRequest,
  type CreateQuizRequest,
  type LectureRecord,
  type QuizContent,
  type QuizDifficulty,
  type TaskType,
} from '@shared/types';
import { ApiRequestError } from '../../api/client';
import { createQuiz, deleteQuiz, fetchQuizzes, saveBankQuestion, updateQuiz } from '../../api/quizzes';
import {
  bulkContent,
  createActivityTask,
  createLecture,
  deleteActivityTask,
  deleteLecture,
  fetchLectures,
  updateActivityTask,
  updateLecture,
} from '../../api/content';
import { fetchTasks } from '../../api/tasks';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { BackLink } from '../../components/layout/BackLink';
import { BookIcon, EditIcon, PlusIcon, QuizIcon, TargetIcon, TrashIcon } from '../../components/common/icons';
import { LIMITS } from '../../lib/limits';
import { Field } from './studioField';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { PublishControls, usePublishing } from './studioParts';
import { QuestionBankPanel } from './QuestionBankPanel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { GradeSelect, gradeLabel } from '../../components/ui/GradeSelect';
import { Notice } from '../../components/ui/Notice';

interface DraftQuestion {
  questionText: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  points: number;
  explanation: string;
}

const emptyQuestion = (): DraftQuestion => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswerIndex: 0,
  points: 1,
  explanation: '',
});

type StudioTab = 'lectures' | 'quizzes' | 'tasks';

const TABS = [
  { id: 'lectures', label: 'Write lectures', icon: BookIcon },
  { id: 'quizzes', label: 'Build quizzes', icon: QuizIcon },
  { id: 'tasks', label: 'Activities & performance tasks', icon: TargetIcon },
] as const;

function FormHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div>
      <h2 id={id} className="text-xl font-semibold text-parchment">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}


interface ManageItem {
  id: string;
  title: string;
  detail: string;
  grade: ContentGrade;
  draft?: boolean;
  publishAt?: string;
}

/** Published items with Edit and Delete. Deleting asks first and says what else goes with it. */
function ManageList({
  heading,
  items,
  isLoading,
  editingId,
  onEdit,
  onDelete,
  deleteWarning,
  emptyTitle,
  kind,
  onBulkDone,
}: {
  kind: 'lecture' | 'task' | 'quiz';
  onBulkDone: () => void;
  heading: string;
  items: ManageItem[];
  isLoading: boolean;
  editingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  deleteWarning: string;
  emptyTitle: string;
}) {
  const [toDelete, setToDelete] = useState<ManageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAt, setBulkAt] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async (action: BulkContentAction) => {
    setBulkBusy(true);
    setError(null);
    setBulkNotice(null);
    try {
      const ids = [...selected].filter((id) => isStoredId(id));
      const result = await bulkContent({
        action,
        items: ids.map((id) => ({ kind, id })),
        ...(action === 'schedule' ? { publishAt: new Date(bulkAt).toISOString() } : {}),
      });
      setBulkNotice(`${result.changed} item${result.changed === 1 ? '' : 's'} updated${result.skipped ? `, ${result.skipped} skipped` : ''}.`);
      setSelected(new Set());
      setBulkDelete(false);
      onBulkDone();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not update those items.');
    } finally {
      setBulkBusy(false);
    }
  };

  const confirm = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(toDelete.id);
      setToDelete(null);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not delete that.');
      setToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section aria-label={heading} className="min-w-0">
      <h2 className="text-xl font-semibold text-parchment">{heading}</h2>
      <p className="mt-1 text-sm text-muted">Fix a typo or remove what you no longer need.</p>
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      {bulkNotice && <Notice tone="success" className="mt-4">{bulkNotice}</Notice>}
      {selected.size > 0 && (
        <div className="surface mt-4 flex flex-col gap-3 p-4" role="group" aria-label="Bulk actions">
          <p className="text-sm text-parchment">{selected.size} selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary btn-sm" disabled={bulkBusy} onClick={() => void runBulk('publish')}>Publish now</button>
            <button type="button" className="btn-secondary btn-sm" disabled={bulkBusy} onClick={() => void runBulk('draft')}>Move to drafts</button>
            <input type="datetime-local" value={bulkAt} onChange={(event) => setBulkAt(event.target.value)} className="field w-52 py-2" aria-label="Schedule date and time" />
            <button type="button" className="btn-secondary btn-sm" disabled={bulkBusy || !bulkAt} onClick={() => void runBulk('schedule')}>Schedule</button>
            <button type="button" className="btn-ghost btn-sm text-clay hover:text-clay" disabled={bulkBusy} onClick={() => setBulkDelete(true)}>Delete…</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}
      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={<BookIcon />} title={emptyTitle} description="Items you publish will be listed here." />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className={`surface flex items-start justify-between gap-3 p-4 ${editingId === item.id ? 'ring-1 ring-gold/60' : ''}`}>
                {isStoredId(item.id) && (
                  <input
                    type="checkbox"
                    className="mt-1 accent-gold"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={`Select ${item.title}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-parchment">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{item.detail}</p>
                  <span className="badge-gold mt-2">{gradeLabel(item.grade)}</span>
                  {item.draft && <span className="badge-neutral ml-1.5 mt-2">Draft — hidden</span>}
                  {!item.draft && item.publishAt && <span className="badge-clay ml-1.5 mt-2">Scheduled · {formatDateTime(item.publishAt)}</span>}
                </div>
                <div className="flex flex-none gap-1">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => onEdit(item.id)} aria-label={`Edit ${item.title}`}>
                    <EditIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-clay hover:text-clay" onClick={() => setToDelete(item)} aria-label={`Delete ${item.title}`}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {bulkDelete && (
        <ConfirmDialog
          title={`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          isBusy={bulkBusy}
          onConfirm={() => void runBulk('delete')}
          onCancel={() => setBulkDelete(false)}
        >
          <p>{deleteWarning}</p>
        </ConfirmDialog>
      )}
      {toDelete && (
        <ConfirmDialog
          title={`Delete “${toDelete.title}”?`}
          confirmLabel="Delete"
          busyLabel="Deleting…"
          isBusy={isDeleting}
          onConfirm={() => void confirm()}
          onCancel={() => setToDelete(null)}
        >
          <p>{deleteWarning}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}

/** datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Sample tasks built into the app are not stored in the database and cannot be edited. */
const isStoredId = (id: string): boolean => /^[0-9a-f]{24}$/i.test(id);

export function ContentStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('quizzes');

  return (
    <DashboardShell
      eyebrow="Teacher workspace"
      title="Content studio"
      subtitle="Create, edit and remove lectures, quizzes, and assignments."
      actions={<BackLink />}
    >
      <div role="tablist" aria-label="Content type" className="mb-8 flex gap-1 overflow-x-auto border-b border-night-border">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id)}
              className={`-mb-px flex flex-none items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? 'border-gold text-parchment' : 'border-transparent text-muted hover:text-parchment'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-gold' : ''}`} />
              {label}
            </button>
          );
        })}
      </div>

      <div key={activeTab} className="animate-fade-in-up">
        {activeTab === 'lectures' && <LectureBuilder />}
        {activeTab === 'tasks' && <ActivityTaskBuilder />}
        {activeTab === 'quizzes' && <QuizBuilder />}
      </div>
    </DashboardShell>
  );
}

function QuizBuilder() {
  const [quizzes, setQuizzes] = useState<QuizContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [randomize, setRandomize] = useState(true);
  const [difficulty, setDifficulty] = useState<QuizDifficulty | ''>('');
  const [questionSeconds, setQuestionSeconds] = useState('');
  const [gradeLevel, setGradeLevel] = useState<ContentGrade | ''>('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const publishing = usePublishing();
  const [bankTopic, setBankTopic] = useState('');
  const [bankRefresh, setBankRefresh] = useState(0);

  const reload = useCallback(() => {
    fetchQuizzes()
      .then(setQuizzes)
      .catch((cause: unknown) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not load quizzes.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const reset = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setTimeLimit('');
    setDueDate('');
    setRandomize(true);
    setGradeLevel('');
    setDifficulty('');
    setQuestionSeconds('');
    publishing.reset();
    setQuestions([emptyQuestion()]);
  };

  const startEdit = (id: string) => {
    const quiz = quizzes.find((item) => item.id === id);
    if (!quiz) return;
    setEditingId(id);
    setNotice(null);
    setError(null);
    setTitle(quiz.title);
    setDescription(quiz.description);
    setTimeLimit(quiz.timeLimitMinutes ? String(quiz.timeLimitMinutes) : '');
    setDueDate(toLocalInput(quiz.dueDate));
    setRandomize(quiz.randomize);
    setDifficulty(quiz.difficulty ?? '');
    setQuestionSeconds(quiz.questionSeconds ? String(quiz.questionSeconds) : '');
    publishing.load(quiz);
    setGradeLevel(quiz.gradeLevel);
    setQuestions(
      quiz.questions.map((question) => ({
        questionText: question.questionText,
        options: [...question.options, '', '', '', ''].slice(0, 4) as DraftQuestion['options'],
        correctAnswerIndex: question.correctAnswerIndex ?? 0,
        points: question.points,
        explanation: question.explanation ?? '',
      })),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateQuestion = (questionIndex: number, update: Partial<DraftQuestion>) => {
    setQuestions((current) => current.map((question, index) => index === questionIndex ? { ...question, ...update } : question));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = [...question.options] as DraftQuestion['options'];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  };

  const addFromBank = (items: QuestionBankItemRecord[]) => {
    if (items.length === 0) return;
    setQuestions((current) => {
      const blankOnly = current.length === 1 && !current[0].questionText.trim();
      const added: DraftQuestion[] = items.map((item) => ({
        questionText: item.questionText,
        options: [...item.options, '', '', '', ''].slice(0, 4) as DraftQuestion['options'],
        correctAnswerIndex: item.correctAnswerIndex,
        points: item.points,
        explanation: item.explanation ?? '',
      }));
      return blankOnly ? added : [...current, ...added];
    });
    setNotice(`Added ${items.length} question${items.length === 1 ? '' : 's'} from the bank.`);
  };

  const saveToBank = async (question: DraftQuestion) => {
    setError(null);
    setNotice(null);
    if (!difficulty) {
      setError('Pick this quiz’s difficulty first — saved questions are tagged with it.');
      return;
    }
    if (!bankTopic.trim()) {
      setError('Type a topic tag (for example “greetings”) before saving to the bank.');
      return;
    }
    try {
      await saveBankQuestion({
        questionText: question.questionText,
        options: question.options,
        correctAnswerIndex: question.correctAnswerIndex,
        points: question.points,
        ...(question.explanation.trim() ? { explanation: question.explanation.trim() } : {}),
        topic: bankTopic,
        difficulty,
      });
      setBankRefresh((value) => value + 1);
      setNotice(`Saved to the bank under “${bankTopic.trim().toLowerCase()}” · ${DIFFICULTY_LABELS[difficulty]}.`);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save that question to the bank.');
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (gradeLevel === '' || publishing.invalid) return;
    setIsSaving(true);
    try {
      const payload: CreateQuizRequest = {
        ...publishing.fields(),
        title,
        description,
        gradeLevel,
        ...(timeLimit ? { timeLimitMinutes: Number(timeLimit) } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        randomize,
        ...(difficulty ? { difficulty } : {}),
        ...(questionSeconds ? { questionSeconds: Number(questionSeconds) } : {}),
        questions,
      };
      const saved = editingId ? await updateQuiz(editingId, payload) : await createQuiz(payload);
      setNotice(editingId ? `“${saved.title}” was updated.` : publishing.mode === 'draft' ? `“${saved.title}” was saved as a draft.` : publishing.mode === 'schedule' ? `“${saved.title}” is scheduled.` : `“${saved.title}” is now available to students.`);
      reset();
      reload();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save this quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section aria-labelledby="quiz-builder-heading">
        <FormHeading
          id="quiz-builder-heading"
          title={editingId ? 'Edit quiz' : 'Build a quiz'}
          description="Questions are scored on the server, so students can't alter their results."
        />
        {editingId && (
          <Notice tone="success" className="mt-4">
            You are editing a published quiz. Past results keep the questions as they were when students took it.
          </Notice>
        )}
        <form onSubmit={(event) => void handleSave(event)} className="mt-5 flex flex-col gap-5">
          <div className="surface flex flex-col gap-5 p-6">
            <Field label="Quiz title">
              <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="field" />
            </Field>
            <Field label="Description">
              <textarea required maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="field" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <GradeSelect value={gradeLevel} onChange={setGradeLevel} />
              <Field label="Time limit (minutes, optional)">
                <input type="number" min={1} max={600} value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="field" />
              </Field>
              <Field label="Speed bonus per question (optional, seconds)">
                <input type="number" min={5} max={120} step={1} value={questionSeconds} onChange={(event) => setQuestionSeconds(event.target.value)} className="field" placeholder="e.g. 20 — students earn bonus XP for answering fast" />
              </Field>
              <Field label="Difficulty (optional)">
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuizDifficulty | '')} className="field">
                  <option value="">Not set</option>
                  {QUIZ_DIFFICULTIES.map((level) => <option key={level} value={level}>{DIFFICULTY_LABELS[level]}</option>)}
                </select>
              </Field>
              <Field label={`Closes on (optional, ${timeZoneName()} time)`}>
                <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="field" />
              </Field>
            </div>
            <label className="flex items-start gap-3 text-sm text-parchment">
              <input type="checkbox" checked={randomize} onChange={(event) => setRandomize(event.target.checked)} className="mt-0.5 accent-gold" />
              <span>
                Shuffle questions and answer choices for each student
                <span className="block text-xs text-muted">Each student sees a different order, which makes copying harder.</span>
              </span>
            </label>
            <PublishControls state={publishing} />
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-muted">
              Each student gets one attempt and sees their results with the correct answers right after submitting. To let a student retake it, open the Grading Center, choose the student(s) and press “Allow retake” — the retake score is reduced by a random 1–5 percentage points (for example, 80% becomes 75–79%).
            </p>
          </div>

          <QuestionBankPanel onAdd={addFromBank} refreshKey={bankRefresh} />
          <Field label="Topic tag for “Save to bank” (e.g. greetings, family, verbs)">
            <input maxLength={60} value={bankTopic} onChange={(event) => setBankTopic(event.target.value)} className="field" placeholder="Used when you save a question to the bank" />
          </Field>

          {questions.map((question, questionIndex) => (
            <fieldset key={questionIndex} className="surface flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <legend className="flex items-center gap-2.5 text-base font-semibold text-parchment">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-xs font-bold text-gold">{questionIndex + 1}</span>
                  Question {questionIndex + 1}
                </legend>
                {questions.length > 1 && (
                  <button type="button" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))} className="btn-ghost btn-sm text-clay hover:text-clay">
                    <TrashIcon className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <Field label="Prompt">
                <input maxLength={LIMITS.question} required value={question.questionText} onChange={(event) => updateQuestion(questionIndex, { questionText: event.target.value })} className="field" />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="field-label">Options — choose the correct one with the round button</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={question.correctAnswerIndex === optionIndex}
                        onChange={() => updateQuestion(questionIndex, { correctAnswerIndex: optionIndex })}
                        aria-label={`Option ${String.fromCharCode(65 + optionIndex)} is the correct answer`}
                        className="h-4 w-4 flex-none accent-gold"
                      />
                      <input
                        required
                        maxLength={LIMITS.option}
                        value={option}
                        onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                        aria-label={`Option ${String.fromCharCode(65 + optionIndex)}`}
                        className={`field ${question.correctAnswerIndex === optionIndex ? 'border-gold/60' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-4">
                <Field label="Points">
                  <input type="number" min={1} step={1} required value={question.points} onChange={(event) => updateQuestion(questionIndex, { points: Number(event.target.value) })} className="field w-28" />
                </Field>
              </div>
              <div>
                <button type="button" className="btn-ghost btn-sm" onClick={() => void saveToBank(question)} disabled={!question.questionText.trim() || question.options.some((option) => !option.trim())}>
                  Save to question bank
                </button>
              </div>
              <Field label="Explanation (optional) — shown to students after they finish">
                <textarea
                  value={question.explanation}
                  onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })}
                  rows={2}
                  maxLength={600}
                  className="field"
                  placeholder="Why is this the correct answer?"
                />
              </Field>
            </fieldset>
          ))}

          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setQuestions((current) => [...current, emptyQuestion()])} className="btn-secondary">
              <PlusIcon className="h-4 w-4" />
              Add question
            </button>
            <button type="submit" disabled={isSaving || gradeLevel === ''} className="btn-primary">
              {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Publish quiz'}
            </button>
            {editingId && <button type="button" className="btn-ghost" onClick={reset}>Cancel editing</button>}
            {gradeLevel === '' && <p className="self-center text-xs text-muted">Choose a grade level to publish.</p>}
          </div>
        </form>
      </section>

      <ManageList
        heading="Published quizzes"
        kind="quiz"
        onBulkDone={reload}
        items={quizzes.map((quiz) => ({
          draft: quiz.draft,
          publishAt: quiz.publishAt,
          id: quiz.id,
          title: quiz.title,
          detail: `${quiz.difficulty ? DIFFICULTY_LABELS[quiz.difficulty] + ' · ' : ''}${quiz.questions.length} questions${quiz.randomize ? ' · shuffled' : ''}${quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ' · no time limit'} · ${quiz.dueDate ? `closes ${formatDateTime(quiz.dueDate)}` : 'never closes'}`,
          grade: quiz.gradeLevel,
        }))}
        isLoading={isLoading}
        editingId={editingId}
        onEdit={startEdit}
        onDelete={async (id) => {
          await deleteQuiz(id);
          if (editingId === id) reset();
          setNotice('Quiz deleted along with its results.');
          reload();
        }}
        deleteWarning="This permanently removes the quiz and every student’s results for it. It can’t be undone."
        emptyTitle="No quizzes yet"
      />
    </div>
  );
}

function LectureBuilder() {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [category, setCategory] = useState<Category>('greetings');
  const [gradeLevel, setGradeLevel] = useState<ContentGrade | ''>('');
  const [historicalContext, setHistoricalContext] = useState('');
  const [etymologyOrigin, setEtymologyOrigin] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lectures, setLectures] = useState<LectureRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const publishing = usePublishing();

  const reload = useCallback(() => {
    fetchLectures()
      .then(setLectures)
      .catch((cause: unknown) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not load lectures.'))
      .finally(() => setIsLoading(false));
  }, []);
  useEffect(reload, [reload]);

  const reset = () => {
    setEditingId(null);
    setWord(''); setTranslation(''); setPhonetic(''); setHistoricalContext(''); setEtymologyOrigin(''); setGradeLevel(''); setCategory('greetings');
    publishing.reset();
  };

  const startEdit = (id: string) => {
    const lecture = lectures.find((item) => item.id === id);
    if (!lecture) return;
    setEditingId(id); setNotice(null); setError(null);
    setWord(lecture.word); setTranslation(lecture.translation); setPhonetic(lecture.phonetic); setCategory(lecture.category);
    setGradeLevel(lecture.gradeLevel); setHistoricalContext(lecture.historicalContext); setEtymologyOrigin(lecture.etymologyOrigin ?? '');
    publishing.load(lecture);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);
    if (gradeLevel === '' || publishing.invalid) return;
    setIsSaving(true);
    try {
      const request: CreateLectureRequest = { gradeLevel, word, translation, phonetic, category, historicalContext, ...(etymologyOrigin.trim() ? { etymologyOrigin } : {}), ...publishing.fields() };
      if (editingId) await updateLecture(editingId, request);
      else await createLecture(request);
      setNotice(editingId ? 'Lecture updated.' : publishing.mode === 'draft' ? 'Lecture saved as a draft.' : publishing.mode === 'schedule' ? 'Lecture scheduled.' : 'Lecture published for students.');
      reset();
      reload();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save this lecture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
    <section aria-labelledby="lecture-heading">
      <FormHeading id="lecture-heading" title={editingId ? 'Edit lecture' : 'Write a lecture'} description="Add a word with its pronunciation and the story behind it." />
      <form onSubmit={(event) => void submit(event)} className="surface mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-7">
        <GradeSelect value={gradeLevel} onChange={setGradeLevel} className="sm:col-span-2" />
        <Field label="Word or phrase"><input maxLength={LIMITS.short} required value={word} onChange={(event) => setWord(event.target.value)} className="field" /></Field>
        <Field label="English translation"><input maxLength={LIMITS.short} required value={translation} onChange={(event) => setTranslation(event.target.value)} className="field" /></Field>
        <Field label="Phonetic guide"><input maxLength={LIMITS.short} required value={phonetic} onChange={(event) => setPhonetic(event.target.value)} className="field" /></Field>
        <Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="field">{VALID_CATEGORIES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></Field>
        <Field label="Historical & cultural story (students see it as short story cards — about two sentences per card; leave a blank line to start a new card)" className="sm:col-span-2"><textarea maxLength={LIMITS.long} required rows={4} value={historicalContext} onChange={(event) => setHistoricalContext(event.target.value)} className="field" /></Field>
        <Field label="Origin tag" className="sm:col-span-2"><input maxLength={LIMITS.short} value={etymologyOrigin} onChange={(event) => setEtymologyOrigin(event.target.value)} className="field" placeholder="Optional, e.g. Sanskrit" /></Field>
        <div className="sm:col-span-2"><PublishControls state={publishing} /></div>
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        {notice && <Notice tone="success" className="sm:col-span-2">{notice}</Notice>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving || gradeLevel === '' || publishing.invalid} className="btn-primary">{isSaving ? 'Saving…' : editingId ? 'Save changes' : publishing.mode === 'draft' ? 'Save draft' : publishing.mode === 'schedule' ? 'Schedule lecture' : 'Publish lecture'}</button>
          {editingId && <button type="button" className="btn-ghost ml-3" onClick={reset}>Cancel editing</button>}
          {gradeLevel === '' && <span className="ml-3 text-xs text-muted">Choose a grade level to publish.</span>}
        </div>
      </form>
    </section>

    <ManageList
      heading="Published lectures"
      kind="lecture"
      onBulkDone={reload}
      items={lectures.map((lecture) => ({ id: lecture.id, title: lecture.word, detail: lecture.translation, grade: lecture.gradeLevel, draft: lecture.draft, publishAt: lecture.publishAt }))}
      isLoading={isLoading}
      editingId={editingId}
      onEdit={startEdit}
      onDelete={async (id) => {
        await deleteLecture(id);
        if (editingId === id) reset();
        setNotice('Lecture deleted.');
        reload();
      }}
      deleteWarning="This removes the lecture for every student. It can’t be undone."
      emptyTitle="No lectures yet"
    />
    </div>
  );
}

function ActivityTaskBuilder() {
  const [type, setType] = useState<TaskType>('ACTIVITY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevel, setGradeLevel] = useState<ContentGrade | ''>('');
  const [totalPoints, setTotalPoints] = useState(10);
  const [dueDate, setDueDate] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const publishing = usePublishing();
  const rubricTotal = criteria.reduce((sum, criterion) => sum + (Number(criterion.maxPoints) || 0), 0);

  const reload = useCallback(() => {
    fetchTasks()
      .then((list) => setTasks(list.filter((item) => isStoredId(item.id))))
      .catch((cause: unknown) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not load tasks.'))
      .finally(() => setIsLoading(false));
  }, []);
  useEffect(reload, [reload]);

  const reset = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setGradeLevel(''); setTotalPoints(10); setDueDate(''); setType('ACTIVITY'); setCriteria([]);
    publishing.reset();
  };

  const startEdit = (id: string) => {
    const item = tasks.find((entry) => entry.id === id);
    if (!item) return;
    setEditingId(id); setNotice(null); setError(null);
    setType(item.type); setTitle(item.title); setDescription(item.description); setGradeLevel(item.gradeLevel);
    setTotalPoints(item.totalPoints); setDueDate(toLocalInput(item.dueDate)); setCriteria(item.rubric ?? []);
    publishing.load(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gradeLevel === '' || publishing.invalid) return;
    if (criteria.some((criterion) => !criterion.name.trim() || !(criterion.maxPoints >= 1))) {
      setError('Give every rubric criterion a name and at least 1 point.');
      return;
    }
    setNotice(null); setError(null); setIsSaving(true);
    try {
      const request: CreateActivityTaskRequest = {
        gradeLevel,
        type,
        title,
        description,
        totalPoints: criteria.length > 0 ? rubricTotal : totalPoints,
        dueDate: new Date(dueDate).toISOString(),
        ...(criteria.length > 0 ? { rubric: criteria.map((c) => ({ name: c.name.trim(), ...(c.description?.trim() ? { description: c.description.trim() } : {}), maxPoints: Number(c.maxPoints) })) } : {}),
        ...publishing.fields(),
      };
      if (editingId) {
        const { type: _type, ...fields } = request;
        await updateActivityTask(editingId, type, fields);
      } else {
        await createActivityTask(request);
      }
      setNotice(editingId ? 'Task updated.' : publishing.mode === 'draft' ? 'Task saved as a draft.' : publishing.mode === 'schedule' ? 'Task scheduled.' : 'Task published for students.');
      reset();
      reload();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save this task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
    <section aria-labelledby="task-heading">
      <FormHeading id="task-heading" title={editingId ? 'Edit task' : 'Set an activity or performance task'} description="Students can submit written responses, and you grade them in the Grading center." />
      <form onSubmit={(event) => void submit(event)} className="surface mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-7">
        <Field label="Task title" className="sm:col-span-2"><input maxLength={LIMITS.short} required value={title} onChange={(event) => setTitle(event.target.value)} className="field" /></Field>
        <Field label="Type"><select disabled={editingId !== null} value={type} onChange={(event) => setType(event.target.value as TaskType)} className="field"><option value="ACTIVITY">Activity</option><option value="PERFORMANCE_TASK">Performance task</option></select></Field>
        <GradeSelect value={gradeLevel} onChange={setGradeLevel} className="sm:col-span-2" />
        <Field label={criteria.length > 0 ? 'Total points (sum of the rubric)' : 'Total points'}><input type="number" min={1} step={1} required readOnly={criteria.length > 0} value={criteria.length > 0 ? rubricTotal : totalPoints} onChange={(event) => setTotalPoints(Number(event.target.value))} className="field" /></Field>
        <Field label="Detailed instructions / prompt" className="sm:col-span-2"><RichTextEditor maxLength={LIMITS.long} required rows={10} value={description} onChange={setDescription} /></Field>
        <Field label={`Due date (${timeZoneName()} time)`}><input type="datetime-local" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="field" /></Field>
        <fieldset className="flex flex-col gap-3 rounded-xl border border-night-border p-4 sm:col-span-2">
          <legend className="field-label px-1">Rubric (optional)</legend>
          <p className="text-xs text-muted">Break the grade into 3–4 criteria with their own point ranges. You score each one when grading, and students see the marks and your comments per criterion.</p>
          {criteria.map((criterion, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[2fr_3fr_auto_auto] sm:items-center">
              <input aria-label={`Criterion ${index + 1} name`} maxLength={100} placeholder="e.g. Grammar" value={criterion.name} onChange={(event) => setCriteria((current) => current.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))} className="field py-2" />
              <input aria-label={`Criterion ${index + 1} description`} maxLength={300} placeholder="What earns full marks (optional)" value={criterion.description ?? ''} onChange={(event) => setCriteria((current) => current.map((row, i) => (i === index ? { ...row, description: event.target.value } : row)))} className="field py-2" />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                0 –
                <input type="number" min={1} max={1000} step={1} aria-label={`Criterion ${index + 1} points`} value={criterion.maxPoints} onChange={(event) => setCriteria((current) => current.map((row, i) => (i === index ? { ...row, maxPoints: Number(event.target.value) } : row)))} className="field w-20 py-2" />
                pts
              </label>
              <button type="button" className="btn-ghost btn-sm text-clay hover:text-clay" onClick={() => setCriteria((current) => current.filter((_, i) => i !== index))}>Remove</button>
            </div>
          ))}
          <div>
            <button type="button" className="btn-secondary btn-sm" disabled={criteria.length >= 4} onClick={() => setCriteria((current) => [...current, { name: '', maxPoints: 5 }])}>
              {criteria.length === 0 ? 'Add a rubric' : 'Add criterion'}
            </button>
            {criteria.length >= 4 && <span className="ml-3 text-xs text-muted">Up to 4 criteria.</span>}
          </div>
        </fieldset>
        <div className="sm:col-span-2"><PublishControls state={publishing} /></div>
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        {notice && <Notice tone="success" className="sm:col-span-2">{notice}</Notice>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving || gradeLevel === '' || publishing.invalid} className="btn-primary">{isSaving ? 'Saving…' : editingId ? 'Save changes' : publishing.mode === 'draft' ? 'Save draft' : publishing.mode === 'schedule' ? 'Schedule task' : 'Publish task'}</button>
          {editingId && <button type="button" className="btn-ghost ml-3" onClick={reset}>Cancel editing</button>}
          {gradeLevel === '' && <span className="ml-3 text-xs text-muted">Choose a grade level to publish.</span>}
        </div>
      </form>
    </section>

    <ManageList
      heading="Published tasks"
      kind="task"
      onBulkDone={reload}
      items={tasks.map((item) => ({
        draft: item.draft,
        publishAt: item.publishAt,
        id: item.id,
        title: item.title,
        detail: `${item.type === 'ACTIVITY' ? 'Activity' : 'Performance task'} · ${item.totalPoints} pts${item.rubric ? ` · ${item.rubric.length}-criterion rubric` : ''} · due ${formatDateTime(item.dueDate)}`,
        grade: item.gradeLevel,
      }))}
      isLoading={isLoading}
      editingId={editingId}
      onEdit={startEdit}
      onDelete={async (id) => {
        await deleteActivityTask(id);
        if (editingId === id) reset();
        setNotice('Task deleted along with its submissions.');
        reload();
      }}
      deleteWarning="This permanently removes the task and every student’s submission, grade and attached file for it. It can’t be undone."
      emptyTitle="No tasks yet"
    />
    </div>
  );
}
