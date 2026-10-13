import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { CreateStudentRequest } from '@shared/types';
import { Notice } from '../ui/Notice';

interface CreateStudentFormProps {
  onSubmit: (request: CreateStudentRequest) => Promise<void>;
  isSaving: boolean;
  error: string | null;
}

const EMPTY: CreateStudentRequest = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  section: '',
};

const inputClasses = 'field';

export function CreateStudentForm({ onSubmit, isSaving, error }: CreateStudentFormProps) {
  const [form, setForm] = useState<CreateStudentRequest>(EMPTY);

  const update = (field: keyof CreateStudentRequest) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await onSubmit(form);
      setForm(EMPTY);
    } catch {
      // Error is already surfaced by the parent via the `error` prop; keep the
      // form filled in so the teacher can fix and resubmit.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
      <label className="block">
        <span className="field-label">Full name</span>
        <input
          required
          value={form.fullName}
          onChange={update('fullName')}
          className={inputClasses}
          placeholder="Ana Reyes"
        />
      </label>

      <label className="block">
        <span className="field-label">Username</span>
        <input
          required
          value={form.username}
          onChange={update('username')}
          className={inputClasses}
          placeholder="ana"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>

      <label className="block">
        <span className="field-label">Email address</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={update('email')}
          className={inputClasses}
          placeholder="ana@example.com"
        />
      </label>

      <label className="block">
        <span className="field-label">Initial password</span>
        <input
          required
          type="text"
          minLength={6}
          value={form.password}
          onChange={update('password')}
          className={inputClasses}
          placeholder="At least 6 characters"
        />
      </label>

      <label className="block">
        <span className="field-label">Section</span>
        <input
          required
          value={form.section}
          onChange={update('section')}
          className={inputClasses}
          placeholder="Grade 10 - Rizal"
        />
      </label>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      <div>
        <button type="submit" disabled={isSaving} className="btn-primary w-full">
          {isSaving ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}
