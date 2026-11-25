import { useCallback, useEffect, useState } from 'react';
import { DIFFICULTY_LABELS, QUIZ_DIFFICULTIES, type QuestionBankItemRecord, type QuizDifficulty } from '@shared/types';
import { fetchQuestionBank, removeBankQuestion } from '../../api/quizzes';
import { ApiRequestError } from '../../api/client';
import { Notice } from '../../components/ui/Notice';

interface QuestionBankPanelProps {
  /** Adds the chosen questions to the quiz being built. */
  onAdd: (items: QuestionBankItemRecord[]) => void;
  /** Bumps when a question has just been saved to the bank, to refresh the list. */
  refreshKey: number;
}

/** Browse saved questions by topic and difficulty, and drop some (or a random set) into the quiz. */
export function QuestionBankPanel({ onAdd, refreshKey }: QuestionBankPanelProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<QuizDifficulty | ''>('');
  const [items, setItems] = useState<QuestionBankItemRecord[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [count, setCount] = useState('5');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchQuestionBank({ ...(topic ? { topic } : {}), ...(difficulty ? { difficulty } : {}) })
      .then((result) => {
        setItems(result.items);
        setTopics(result.topics);
        setError(null);
      })
      .catch((cause: unknown) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not load the question bank.'))
      .finally(() => setLoading(false));
  }, [topic, difficulty]);

  useEffect(() => {
    if (open) load();
  }, [open, load, refreshKey]);

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addPicked = () => {
    onAdd(items.filter((item) => picked.has(item.id)));
    setPicked(new Set());
  };

  const addRandom = () => {
    const wanted = Math.max(1, Math.min(Number(count) || 1, items.length));
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    onAdd(pool.slice(0, wanted));
  };

  const remove = async (id: string) => {
    try {
      await removeBankQuestion(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not remove that question.');
    }
  };

  return (
    <section className="surface p-5" aria-label="Question bank">
      <button type="button" className="flex w-full items-center justify-between text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="text-base font-semibold text-parchment">Question bank</span>
        <span className="text-xs text-muted">{open ? 'Hide' : 'Build from saved questions'}</span>
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-muted">
              Topic{' '}
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="field py-2">
                <option value="">All topics</option>
                {topics.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="text-sm text-muted">
              Difficulty{' '}
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuizDifficulty | '')} className="field py-2">
                <option value="">Any</option>
                {QUIZ_DIFFICULTIES.map((level) => <option key={level} value={level}>{DIFFICULTY_LABELS[level]}</option>)}
              </select>
            </label>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {loading && <p className="text-sm text-muted">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted">Nothing saved here yet. Use “Save to bank” on any question you write, with a topic and the quiz’s difficulty.</p>
          )}
          {items.length > 0 && (
            <>
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 rounded-xl border border-night-border p-3 text-sm">
                    <input type="checkbox" className="mt-1 accent-gold" checked={picked.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select: ${item.questionText}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-parchment">{item.questionText}</p>
                      <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <span className="badge-neutral">{item.topic}</span>
                        <span className="badge-gold">{DIFFICULTY_LABELS[item.difficulty]}</span>
                        <span className="badge-neutral">{item.points} pt{item.points === 1 ? '' : 's'}</span>
                      </p>
                    </div>
                    <button type="button" className="btn-ghost btn-sm text-clay hover:text-clay" onClick={() => void remove(item.id)} aria-label="Remove from bank">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary btn-sm" disabled={picked.size === 0} onClick={addPicked}>
                  Add selected{picked.size > 0 ? ` (${picked.size})` : ''}
                </button>
                <span className="text-xs text-muted">or</span>
                <label className="flex items-center gap-2 text-sm text-muted">
                  Add
                  <input type="number" min={1} max={items.length} value={count} onChange={(event) => setCount(event.target.value)} className="field w-20 py-2" />
                  random from this list
                </label>
                <button type="button" className="btn-secondary btn-sm" onClick={addRandom}>Add random</button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
