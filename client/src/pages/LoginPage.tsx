import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from '@shared/types';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dashboardPathFor } from '../auth/routes';

const ROLES: { id: UserRole; label: string; hint: string }[] = [
  { id: 'STUDENT', label: 'Student', hint: 'Learn words, take quizzes, submit work.' },
  { id: 'TEACHER', label: 'Teacher', hint: 'Manage students, content, and grades.' },
];

export function LoginPage() {
  const { session, isRestoring, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState<UserRole>('STUDENT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isRestoring && session) {
    return <Navigate to={dashboardPathFor(session.user.role)} replace />;
  }

  const chooseRole = (next: UserRole) => {
    setRole(next);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const next = await login({ username, password, role });
      const home = dashboardPathFor(next.user.role);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Try again.');
      setIsSubmitting(false);
    }
  };

  const activeRole = ROLES.find((item) => item.id === role) ?? ROLES[0];
  const inputClasses =
    'w-full rounded-lg border border-night-border bg-night px-4 py-2.5 text-parchment placeholder:text-muted/60 focus:border-gold';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl font-semibold text-parchment">
          Salita
          <span aria-hidden="true" className="ml-2 inline-block h-1.5 w-6 rounded-full bg-gold" />
        </Link>

        <div className="mt-6 rounded-xl border border-night-border bg-night-panel p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-parchment">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Choose how you&apos;ll be using Salita.</p>

          <div role="group" aria-label="Account type" className="mt-5 grid grid-cols-2 gap-2">
            {ROLES.map((item) => {
              const isActive = item.id === role;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseRole(item.id)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-gold bg-gold text-night'
                      : 'border-night-border text-muted hover:text-parchment'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">{activeRole.hint}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm text-parchment">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm text-parchment">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClasses}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-parchment"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : `Sign in as ${activeRole.label.toLowerCase()}`}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
