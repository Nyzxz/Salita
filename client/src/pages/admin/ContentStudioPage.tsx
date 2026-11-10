import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  VALID_CATEGORIES,
  type ActivityTask,
  type Category,
  type ContentGrade,
  type CreateActivityTaskRequest,
  type CreateLectureRequest,
  type CreateQuizRequest,
  type LectureRecord,
  type QuizContent,
  type TaskType,
} from '@shared/types';
import { ApiRequestError } from '../../api/client';
import { createQuiz, deleteQuiz, fetchQuizzes, updateQuiz } from '../../api/quizzes';
import {
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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { GradeSelect, gradeLabel } from '../../components/ui/GradeSelect';
import { Notice } from '../../components/ui/Notice';

interface DraftQuestion {
  questionText: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  points: number;
}

const emptyQuestion = (): DraftQuestion => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswerIndex: 0,
  points: 1,
});

type StudioTab = 'lectures' | 'quizzes' | 'tasks';

const TABS = [
  { id: 'lectures', label: 'Write lectures', icon: BookIcon },
  { id: 'quizzes', label: 'Build quizzes', icon: QuizIcon },
  { id: 'tasks', label: 'Activities & performance tasks', icon: TargetIcon },
] as const;

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

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
}: {
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
      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={<BookIcon />} title={emptyTitle} description="Items you publish will be listed here." />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className={`surface flex items-start justify-between gap-3 p-4 ${editingId === item.id ? 'ring-1 ring-gold/60' : ''}`}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-parchment">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{item.detail}</p>
                  <span className="badge-gold mt-2">{gradeLabel(item.grade)}</span>
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
  const [gradeLevel, setGradeLevel] = useState<ContentGrade | ''>('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setGradeLevel(quiz.gradeLevel);
    setQuestions(
      quiz.questions.map((question) => ({
        questionText: question.questionText,
        options: [...question.options, '', '', '', ''].slice(0, 4) as DraftQuestion['options'],
        correctAnswerIndex: question.correctAnswerIndex ?? 0,
        points: question.points,
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

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (gradeLevel === '') return;
    setIsSaving(true);
    try {
      const payload: CreateQuizRequest = {
        title,
        description,
        gradeLevel,
        ...(timeLimit ? { timeLimitMinutes: Number(timeLimit) } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        randomize,
        questions,
      };
      const saved = editingId ? await updateQuiz(editingId, payload) : await createQuiz(payload);
      setNotice(editingId ? `“${saved.title}” was updated.` : `“${saved.title}” is now available to students.`);
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
              <Field label="Closes on (optional)">
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
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-muted">
              Each student gets one attempt and sees their results with the correct answers right after submitting. To let a student retake it, open the Grading Center, choose the student(s) and press “Allow retake” — a retake loses a random 1–5%.
            </p>
          </div>

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
              <div className="grid gap-3 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <Field key={optionIndex} label={`Option ${String.fromCharCode(65 + optionIndex)}${question.correctAnswerIndex === optionIndex ? ' · correct' : ''}`}>
                    <input required maxLength={LIMITS.option} value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className="field" />
                  </Field>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <Field label="Correct answer">
                  <select value={question.correctAnswerIndex} onChange={(event) => updateQuestion(questionIndex, { correctAnswerIndex: Number(event.target.value) })} className="field">
                    {question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}</option>)}
                  </select>
                </Field>
                <Field label="Points">
                  <input type="number" min={1} step={1} required value={question.points} onChange={(event) => updateQuestion(questionIndex, { points: Number(event.target.value) })} className="field w-28" />
                </Field>
              </div>
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
        items={quizzes.map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
          detail: `${quiz.questions.length} questions${quiz.randomize ? ' · shuffled' : ''}${quiz.dueDate ? ` · closes ${new Date(quiz.dueDate).toLocaleDateString()}` : ''}`,
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
  };

  const startEdit = (id: string) => {
    const lecture = lectures.find((item) => item.id === id);
    if (!lecture) return;
    setEditingId(id); setNotice(null); setError(null);
    setWord(lecture.word); setTranslation(lecture.translation); setPhonetic(lecture.phonetic); setCategory(lecture.category);
    setGradeLevel(lecture.gradeLevel); setHistoricalContext(lecture.historicalContext); setEtymologyOrigin(lecture.etymologyOrigin ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);
    if (gradeLevel === '') return;
    setIsSaving(true);
    try {
      const request: CreateLectureRequest = { gradeLevel, word, translation, phonetic, category, historicalContext, ...(etymologyOrigin.trim() ? { etymologyOrigin } : {}) };
      if (editingId) await updateLecture(editingId, request);
      else await createLecture(request);
      setNotice(editingId ? 'Lecture updated.' : 'Lecture published for students.');
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
        <Field label="Historical & cultural etymology note" className="sm:col-span-2"><textarea maxLength={LIMITS.long} required rows={4} value={historicalContext} onChange={(event) => setHistoricalContext(event.target.value)} className="field" /></Field>
        <Field label="Origin tag" className="sm:col-span-2"><input maxLength={LIMITS.short} value={etymologyOrigin} onChange={(event) => setEtymologyOrigin(event.target.value)} className="field" placeholder="Optional, e.g. Sanskrit" /></Field>
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        {notice && <Notice tone="success" className="sm:col-span-2">{notice}</Notice>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving || gradeLevel === ''} className="btn-primary">{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Publish lecture'}</button>
          {editingId && <button type="button" className="btn-ghost ml-3" onClick={reset}>Cancel editing</button>}
          {gradeLevel === '' && <span className="ml-3 text-xs text-muted">Choose a grade level to publish.</span>}
        </div>
      </form>
    </section>

    <ManageList
      heading="Published lectures"
      items={lectures.map((lecture) => ({ id: lecture.id, title: lecture.word, detail: lecture.translation, grade: lecture.gradeLevel }))}
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

  const reload = useCallback(() => {
    fetchTasks()
      .then((list) => setTasks(list.filter((item) => isStoredId(item.id))))
      .catch((cause: unknown) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not load tasks.'))
      .finally(() => setIsLoading(false));
  }, []);
  useEffect(reload, [reload]);

  const reset = () => {
    setEditingId(null);
    setTitle(''); setDescription(''); setGradeLevel(''); setTotalPoints(10); setDueDate(''); setType('ACTIVITY');
  };

  const startEdit = (id: string) => {
    const item = tasks.find((entry) => entry.id === id);
    if (!item) return;
    setEditingId(id); setNotice(null); setError(null);
    setType(item.type); setTitle(item.title); setDescription(item.description); setGradeLevel(item.gradeLevel);
    setTotalPoints(item.totalPoints); setDueDate(toLocalInput(item.dueDate));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gradeLevel === '') return;
    setNotice(null); setError(null); setIsSaving(true);
    try {
      const request: CreateActivityTaskRequest = { gradeLevel, type, title, description, totalPoints, dueDate: new Date(dueDate).toISOString() };
      if (editingId) {
        const { type: _type, ...fields } = request;
        await updateActivityTask(editingId, type, fields);
      } else {
        await createActivityTask(request);
      }
      setNotice(editingId ? 'Task updated.' : 'Task published for students.');
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
        <Field label="Total points"><input type="number" min={1} step={1} required value={totalPoints} onChange={(event) => setTotalPoints(Number(event.target.value))} className="field" /></Field>
        <Field label="Detailed instructions / prompt" className="sm:col-span-2"><textarea maxLength={LIMITS.long} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="field" /></Field>
        <Field label="Due date"><input type="datetime-local" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="field" /></Field>
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        {notice && <Notice tone="success" className="sm:col-span-2">{notice}</Notice>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving || gradeLevel === ''} className="btn-primary">{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Publish task'}</button>
          {editingId && <button type="button" className="btn-ghost ml-3" onClick={reset}>Cancel editing</button>}
          {gradeLevel === '' && <span className="ml-3 text-xs text-muted">Choose a grade level to publish.</span>}
        </div>
      </form>
    </section>

    <ManageList
      heading="Published tasks"
      items={tasks.map((item) => ({
        id: item.id,
        title: item.title,
        detail: `${item.type === 'ACTIVITY' ? 'Activity' : 'Performance task'} · ${item.totalPoints} pts · due ${new Date(item.dueDate).toLocaleDateString()}`,
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
