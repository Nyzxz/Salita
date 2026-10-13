import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { VALID_CATEGORIES, type Category, type CreateActivityTaskRequest, type CreateLectureRequest, type CreateQuizRequest, type QuizAttemptRecord, type QuizContent, type TaskType } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import { ApiRequestError } from '../../api/client';
import { createQuiz, fetchQuizResults } from '../../api/quizzes';
import { createActivityTask, createLecture } from '../../api/content';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { BackLink } from '../../components/layout/BackLink';
import { BookIcon, ChartIcon, PlusIcon, QuizIcon, TargetIcon, TrashIcon } from '../../components/common/icons';
import { EmptyState } from '../../components/ui/EmptyState';
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

export function ContentStudioPage() {
  const { session } = useAuth();
  const token = session?.token ?? '';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [results, setResults] = useState<QuizAttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('quizzes');

  useEffect(() => {
    let active = true;
    fetchQuizResults(token)
      .then((records) => { if (active) setResults(records); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiRequestError ? cause.message : 'Could not load quiz results.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [token]);

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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const payload: CreateQuizRequest = {
        title,
        description,
        ...(timeLimit ? { timeLimitMinutes: Number(timeLimit) } : {}),
        questions,
      };
      const created: QuizContent = await createQuiz(payload, token);
      setTitle('');
      setDescription('');
      setTimeLimit('');
      setQuestions([emptyQuestion()]);
      setNotice(`“${created.title}” is now available to students.`);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save this quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell
      eyebrow="Teacher workspace"
      title="Content studio"
      subtitle="Create lectures, quizzes, and assignments, then review student performance."
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
        {activeTab === 'lectures' && <LectureBuilder token={token} />}
        {activeTab === 'tasks' && <ActivityTaskBuilder token={token} />}
        {activeTab === 'quizzes' && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <section aria-labelledby="quiz-builder-heading">
              <FormHeading id="quiz-builder-heading" title="Build a quiz" description="Questions are scored on the server, so students can't alter their results." />
              <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-5">
                <div className="surface flex flex-col gap-5 p-6">
                  <Field label="Quiz title">
                    <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="field" />
                  </Field>
                  <Field label="Description">
                    <textarea required maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="field" />
                  </Field>
                  <Field label="Time limit (minutes, optional)" className="max-w-xs">
                    <input type="number" min={1} max={600} value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="field" />
                  </Field>
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
                      <input required value={question.questionText} onChange={(event) => updateQuestion(questionIndex, { questionText: event.target.value })} className="field" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <Field key={optionIndex} label={`Option ${String.fromCharCode(65 + optionIndex)}${question.correctAnswerIndex === optionIndex ? ' · correct' : ''}`}>
                          <input required value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className="field" />
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
                  <button type="submit" disabled={isSaving} className="btn-primary">{isSaving ? 'Publishing…' : 'Publish quiz'}</button>
                </div>
              </form>
            </section>

            <section aria-labelledby="quiz-results-heading" className="min-w-0">
              <FormHeading id="quiz-results-heading" title="Student results" description="Class-wide quiz attempts, newest first." />
              <div className="mt-5">
                {isLoading ? (
                  <p className="text-sm text-muted">Loading results…</p>
                ) : results.length === 0 ? (
                  <EmptyState icon={<ChartIcon />} title="No attempts yet" description="Scores appear here as soon as students complete a quiz." />
                ) : (
                  <div className="table-wrap overflow-x-auto">
                    <table className="data-table min-w-[460px]">
                      <thead>
                        <tr><th>Student / Quiz</th><th>Score</th><th>Completed</th></tr>
                      </thead>
                      <tbody>
                        {results.map((result) => (
                          <tr key={result.id}>
                            <td><div className="font-medium text-parchment">{result.studentName}</div><div className="mt-0.5 text-xs text-muted">{result.quizTitle}</div></td>
                            <td className="whitespace-nowrap"><span className={result.percentageScore >= 75 ? 'badge-leaf' : result.percentageScore >= 50 ? 'badge-gold' : 'badge-clay'}>{result.percentageScore}%</span><div className="mt-1 text-xs text-muted">{result.scoreObtained}/{result.totalPossiblePoints}</div></td>
                            <td className="text-xs text-muted">{new Date(result.completedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function LectureBuilder({ token }: { token: string }) {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [category, setCategory] = useState<Category>('greetings');
  const [historicalContext, setHistoricalContext] = useState('');
  const [etymologyOrigin, setEtymologyOrigin] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);
    setIsSaving(true);
    try {
      const request: CreateLectureRequest = { word, translation, phonetic, category, historicalContext, ...(etymologyOrigin.trim() ? { etymologyOrigin } : {}) };
      await createLecture(request, token);
      setWord(''); setTranslation(''); setPhonetic(''); setHistoricalContext(''); setEtymologyOrigin('');
      setNotice('Lecture published for students.');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save this lecture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-3xl" aria-labelledby="lecture-heading">
      <FormHeading id="lecture-heading" title="Write a lecture" description="Add a word with its pronunciation and the story behind it." />
      <form onSubmit={(event) => void submit(event)} className="surface mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-7">
        <Field label="Word or phrase"><input required value={word} onChange={(event) => setWord(event.target.value)} className="field" /></Field>
        <Field label="English translation"><input required value={translation} onChange={(event) => setTranslation(event.target.value)} className="field" /></Field>
        <Field label="Phonetic guide"><input required value={phonetic} onChange={(event) => setPhonetic(event.target.value)} className="field" /></Field>
        <Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="field">{VALID_CATEGORIES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></Field>
        <Field label="Historical & cultural etymology note" className="sm:col-span-2"><textarea required rows={4} value={historicalContext} onChange={(event) => setHistoricalContext(event.target.value)} className="field" /></Field>
        <Field label="Origin tag" className="sm:col-span-2"><input value={etymologyOrigin} onChange={(event) => setEtymologyOrigin(event.target.value)} className="field" placeholder="Optional, e.g. Sanskrit" /></Field>
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        {notice && <Notice tone="success" className="sm:col-span-2">{notice}</Notice>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving} className="btn-primary">{isSaving ? 'Publishing…' : 'Publish lecture'}</button>
        </div>
      </form>
    </section>
  );
}

function ActivityTaskBuilder({ token }: { token: string }) {
  const [type, setType] = useState<TaskType>('ACTIVITY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalPoints, setTotalPoints] = useState(10);
  const [dueDate, setDueDate] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null); setError(null); setIsSaving(true);
    try {
      const request: CreateActivityTaskRequest = { type, title, description, totalPoints, dueDate: new Date(dueDate).toISOString() };
      await createActivityTask(request, token);
      setTitle(''); setDescription(''); setNotice('Task published for students.');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not save this task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-3xl" aria-labelledby="task-heading">
      <FormHeading id="task-heading" title="Set an activity or performance task" description="Students can submit written responses, and you grade them in the Grading center." />
      <form onSubmit={(event) => void submit(event)} className="surface mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-7">
        <Field label="Task title" className="sm:col-span-2"><input required value={title} onChange={(event) => setTitle(event.target.value)} className="field" /></Field>
        <Field label="Type"><select value={type} onChange={(event) => setType(event.target.value as TaskType)} className="field"><option value="ACTIVITY">Activity</option><option value="PERFORMANCE_TASK">Performance task</option></select></Field>
        <Field label="Total points"><input type="number" min={1} step={1} required value={totalPoints} onChange={(event) => setTotalPoints(Number(event.target.value))} className="field" /></Field>
        <Field label="Detailed instructions / prompt" className="sm:col-span-2"><textarea required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="field" /></Field>
        <Field label="Due date"><input type="datetime-local" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="field" /></Field>
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        {notice && <Notice tone="success" className="sm:col-span-2">{notice}</Notice>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving} className="btn-primary">{isSaving ? 'Publishing…' : 'Publish task'}</button>
        </div>
      </form>
    </section>
  );
}
