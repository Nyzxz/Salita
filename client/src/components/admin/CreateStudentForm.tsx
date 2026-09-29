import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { CreateStudentRequest } from '@shared/types';

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

const inputClasses =
  'w-full rounded-lg border border-night-border bg-night px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/60 focus:border-gold';

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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm text-parchment">
        Full name
        <input
          required
          value={form.fullName}
          onChange={update('fullName')}
          className={inputClasses}
          placeholder="Ana Reyes"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-parchment">
        Username
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

      <label className="flex flex-col gap-1.5 text-sm text-parchment">
        Email address
        <input
          required
          type="email"
          value={form.email}
          onChange={update('email')}
          className={inputClasses}
          placeholder="ana@example.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-parchment">
        Initial password
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

      <label className="flex flex-col gap-1.5 text-sm text-parchment sm:col-span-2">
        Section
        <input
          required
          value={form.section}
          onChange={update('section')}
          className={inputClasses}
          placeholder="Grade 10 - Rizal"
        />
      </label>

      {error && (
        <p role="alert" className="sm:col-span-2 rounded-lg border border-clay/40 bg-clay/10 px-4 py-2.5 text-sm text-parchment">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  );
}
