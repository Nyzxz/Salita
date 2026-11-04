import { useState, type FormEvent } from 'react';
import { changeMyPassword } from '../../api/auth';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { passwordRules } from '../../lib/passwordRules';
import { CheckIcon, EyeIcon, EyeOffIcon, LockIcon } from '../common/icons';
import { Notice } from '../ui/Notice';

interface ChangePasswordFormProps {
  /** Called after the password was changed and the fresh session is stored. */
  onChanged?: () => void;
  /** Text for the submit button. */
  submitLabel?: string;
}

export function ChangePasswordForm({ onChanged, submitLabel = 'Update password' }: ChangePasswordFormProps) {
  const { session, replaceSession } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const username = session?.user.username ?? '';
  const rules = passwordRules(next, current, username);
  const allMet = rules.every((rule) => rule.met);
  const matches = confirm.length > 0 && confirm === next;
  const canSubmit = current.length > 0 && allMet && matches && !isSaving;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || !canSubmit) return;
    setError(null);
    setIsSaving(true);
    try {
      const fresh = await changeMyPassword({ currentPassword: current, newPassword: next }, session.token);
      replaceSession(fresh);
      setCurrent('');
      setNext('');
      setConfirm('');
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not change your password. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputType = show ? 'text' : 'password';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="block">
        <span className="field-label">Current password</span>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type={inputType}
            autoComplete="current-password"
            required
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className="field pl-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-parchment"
          >
            {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label className="block">
        <span className="field-label">New password</span>
        <input
          type={inputType}
          autoComplete="new-password"
          required
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className="field"
        />
      </label>

      <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Password requirements">
        {rules.map((rule) => (
          <li key={rule.id} className={`flex items-center gap-2 text-xs ${rule.met ? 'text-leaf' : 'text-muted'}`}>
            <span
              className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                rule.met ? 'border-leaf bg-leaf/15' : 'border-night-border'
              }`}
            >
              {rule.met && <CheckIcon className="h-2.5 w-2.5" />}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>

      <label className="block">
        <span className="field-label">Confirm new password</span>
        <input
          type={inputType}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="field"
          aria-invalid={confirm.length > 0 && !matches}
        />
        {confirm.length > 0 && !matches && <span className="mt-1.5 block text-xs text-clay">Passwords don’t match yet.</span>}
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      <button type="submit" disabled={!canSubmit} className="btn-primary w-full sm:w-auto sm:self-start">
        {isSaving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
