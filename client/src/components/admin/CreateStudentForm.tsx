import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { GRADE_LEVELS, type CreateStudentRequest, type GradeLevel } from '@shared/types';
import { generateDefaultPassword } from '../../lib/passwordRules';
import { CheckIcon, RefreshIcon } from '../common/icons';
import { Notice } from '../ui/Notice';

interface CreateStudentFormProps {
  onSubmit: (request: CreateStudentRequest) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

interface Draft {
  fullName: string;
  username: string;
  email: string;
  section: GradeLevel | '';
}

const EMPTY: Draft = { fullName: '', username: '', email: '', section: '' };

export function CreateStudentForm({ onSubmit, isSaving, error }: CreateStudentFormProps) {
  const [form, setForm] = useState<Draft>(EMPTY);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const detailsFilled =
    form.fullName.trim().length > 0 && form.username.trim().length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  // Fill in a default password as soon as name, username and email are all there.
  useEffect(() => {
    if (detailsFilled && password === '') {
      setPassword(generateDefaultPassword(form.fullName, form.username));
    }
    if (!detailsFilled && password !== '') setPassword('');
  }, [detailsFilled, password, form.fullName, form.username]);

  const update = (field: keyof Draft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const regenerate = () => setPassword(generateDefaultPassword(form.fullName, form.username));

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the password is visible to copy by hand.
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.section === '' || password === '') return;
    try {
      await onSubmit({ ...form, section: form.section, password });
      setForm(EMPTY);
      setPassword('');
    } catch {
      // Error is already surfaced by the parent via the `error` prop; keep the
      // form filled in so the teacher can fix and resubmit.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
      <label className="block">
        <span className="field-label">Full name</span>
        <input required value={form.fullName} onChange={update('fullName')} className="field" placeholder="Ana Reyes" />
      </label>

      <label className="block">
        <span className="field-label">Username</span>
        <input
          required
          value={form.username}
          onChange={update('username')}
          className="field"
          placeholder="ana"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>

      <label className="block">
        <span className="field-label">Email address</span>
        <input required type="email" value={form.email} onChange={update('email')} className="field" placeholder="ana@example.com" />
      </label>

      <div>
        <span className="field-label">Initial password</span>
        <div className="flex gap-2">
          <input
            readOnly
            value={password}
            placeholder="Created once name, username and email are filled in"
            aria-label="Initial password"
            className="field font-mono text-gold-soft"
          />
          <button type="button" onClick={regenerate} disabled={!detailsFilled} className="btn-secondary flex-none px-3" aria-label="Generate a different password" title="Generate a different password">
            <RefreshIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void copyPassword()} disabled={password === ''} className="btn-secondary flex-none px-3" aria-label="Copy password" title="Copy password">
            {copied ? <CheckIcon className="h-4 w-4 text-leaf" /> : <CopyGlyph />}
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          A default password is made for you. The student is asked to replace it the first time they sign in.
        </p>
      </div>

      <label className="block">
        <span className="field-label">Grade</span>
        <select required value={form.section} onChange={update('section')} className="field">
          <option value="" disabled>
            Select grade (7–12)…
          </option>
          {GRADE_LEVELS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      <div>
        <button type="submit" disabled={isSaving || password === '' || form.section === ''} className="btn-primary w-full">
          {isSaving ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}
