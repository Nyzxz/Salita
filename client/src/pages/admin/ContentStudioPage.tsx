import { useEffect, useState, type FormEvent } from 'react';
import { VALID_CATEGORIES, type Category, type CreateActivityTaskRequest, type CreateLectureRequest, type CreateQuizRequest, type QuizAttemptRecord, type QuizContent, type TaskType } from '@shared/types';
import { useAuth } from '../../auth/AuthContext';
import { ApiRequestError } from '../../api/client';
import { createQuiz, fetchQuizResults } from '../../api/quizzes';
import { createActivityTask, createLecture } from '../../api/content';
import { DashboardShell } from '../../components/layout/DashboardShell';

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
  const [activeTab, setActiveTab] = useState<'lectures' | 'quizzes' | 'tasks'>('quizzes');

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
    <DashboardShell title="Content studio" subtitle="Create lectures, quizzes, and assignments, then review student performance.">
      <div role="tablist" aria-label="Content type" className="mb-8 flex flex-wrap gap-2 border-b border-night-border">
        {([
          ['lectures', 'Write lectures'],
          ['quizzes', 'Build quizzes'],
          ['tasks', 'Activities & performance tasks'],
        ] as const).map(([tab, label]) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-parchment'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'lectures' && <LectureBuilder token={token} />}
      {activeTab === 'tasks' && <ActivityTaskBuilder token={token} />}
      {activeTab === 'quizzes' && <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section aria-labelledby="quiz-builder-heading">
          <h2 id="quiz-builder-heading" className="font-display text-2xl font-semibold text-parchment">Build a quiz</h2>
          <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm text-parchment">
              Quiz title
              <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-parchment">
              Description
              <textarea required maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5" />
            </label>
            <label className="flex max-w-xs flex-col gap-1.5 text-sm text-parchment">
              Time limit (minutes, optional)
              <input type="number" min={1} max={600} value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5" />
            </label>

            {questions.map((question, questionIndex) => (
              <fieldset key={questionIndex} className="flex flex-col gap-4 border-t border-night-border pt-5">
                <div className="flex items-center justify-between gap-3">
                  <legend className="font-display text-lg font-semibold text-parchment">Question {questionIndex + 1}</legend>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))} className="text-sm text-clay hover:underline">Remove</button>
                  )}
                </div>
                <label className="flex flex-col gap-1.5 text-sm text-muted">
                  Prompt
                  <input required value={question.questionText} onChange={(event) => updateQuestion(questionIndex, { questionText: event.target.value })} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex flex-col gap-1.5 text-sm text-muted">
                      Option {String.fromCharCode(65 + optionIndex)}
                      <input required value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex flex-col gap-1.5 text-sm text-muted">
                    Correct answer
                    <select value={question.correctAnswerIndex} onChange={(event) => updateQuestion(questionIndex, { correctAnswerIndex: Number(event.target.value) })} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment">
                      {question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-muted">
                    Points
                    <input type="number" min={1} step={1} required value={question.points} onChange={(event) => updateQuestion(questionIndex, { points: Number(event.target.value) })} className="w-28 rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" />
                  </label>
                </div>
              </fieldset>
            ))}

            {error && <p role="alert" className="text-sm text-clay">{error}</p>}
            {notice && <p role="status" className="text-sm text-leaf">{notice}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setQuestions((current) => [...current, emptyQuestion()])} className="rounded-md border border-night-border px-4 py-2.5 text-sm text-parchment hover:border-gold/50">Add question</button>
              <button type="submit" disabled={isSaving} className="rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-night disabled:opacity-50">{isSaving ? 'Publishing…' : 'Publish quiz'}</button>
            </div>
          </form>
        </section>

        <section aria-labelledby="quiz-results-heading">
          <h2 id="quiz-results-heading" className="font-display text-2xl font-semibold text-parchment">Student results</h2>
          <p className="mt-1 text-sm text-muted">Class-wide quiz attempts, newest first.</p>
          {isLoading ? <p className="mt-5 text-sm text-muted">Loading results…</p> : results.length === 0 ? (
            <p className="mt-5 text-sm text-muted">No quiz attempts have been submitted yet.</p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-lg border border-night-border">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead className="bg-night-panel text-xs uppercase text-muted">
                  <tr><th className="px-3 py-3">Student / Quiz</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Completed</th></tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-t border-night-border align-top text-parchment">
                      <td className="px-3 py-3"><div>{result.studentName}</div><div className="mt-1 text-xs text-muted">{result.quizTitle}</div></td>
                      <td className="whitespace-nowrap px-3 py-3">{result.scoreObtained}/{result.totalPossiblePoints}<div className="text-xs text-muted">{result.percentageScore}%</div></td>
                      <td className="px-3 py-3 text-xs text-muted">{new Date(result.completedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>}
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
    <section className="max-w-3xl">
      <h2 className="font-display text-2xl font-semibold text-parchment">Write a lecture</h2>
      <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted">Word or phrase<input required value={word} onChange={(event) => setWord(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">English translation<input required value={translation} onChange={(event) => setTranslation(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">Phonetic guide<input required value={phonetic} onChange={(event) => setPhonetic(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">Category<select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment">{VALID_CATEGORIES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted sm:col-span-2">Historical & cultural etymology note<textarea required rows={4} value={historicalContext} onChange={(event) => setHistoricalContext(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted sm:col-span-2">Origin tag<input value={etymologyOrigin} onChange={(event) => setEtymologyOrigin(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" placeholder="Optional, e.g. Sanskrit" /></label>
        {error && <p role="alert" className="text-sm text-clay sm:col-span-2">{error}</p>}
        {notice && <p role="status" className="text-sm text-leaf sm:col-span-2">{notice}</p>}
        <button type="submit" disabled={isSaving} className="justify-self-start rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-night disabled:opacity-50">{isSaving ? 'Publishing…' : 'Publish lecture'}</button>
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
    <section className="max-w-3xl">
      <h2 className="font-display text-2xl font-semibold text-parchment">Set an activity or performance task</h2>
      <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-muted sm:col-span-2">Task title<input required value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">Category<select value={type} onChange={(event) => setType(event.target.value as TaskType)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment"><option value="ACTIVITY">Activity</option><option value="PERFORMANCE_TASK">Performance task</option></select></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">Total points<input type="number" min={1} step={1} required value={totalPoints} onChange={(event) => setTotalPoints(Number(event.target.value))} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted sm:col-span-2">Detailed instructions / prompt<textarea required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">Due date<input type="datetime-local" required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-md border border-night-border bg-night-panel px-3 py-2.5 text-parchment" /></label>
        {error && <p role="alert" className="text-sm text-clay sm:col-span-2">{error}</p>}
        {notice && <p role="status" className="text-sm text-leaf sm:col-span-2">{notice}</p>}
        <button type="submit" disabled={isSaving} className="justify-self-start rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-night disabled:opacity-50">{isSaving ? 'Publishing…' : 'Publish task'}</button>
      </form>
    </section>
  );
}