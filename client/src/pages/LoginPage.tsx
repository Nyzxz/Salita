import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from '@shared/types';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dashboardPathFor } from '../auth/routes';
import { ArrowLeftIcon, LockIcon, UserIcon } from '../components/common/icons';

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
  const roleIndex = ROLES.findIndex((item) => item.id === role);

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

  const activeRole = ROLES[roleIndex] ?? ROLES[0];
  const inputClasses =
    'w-full rounded-lg border border-night-border bg-night py-2.5 pl-10 pr-4 text-parchment placeholder:text-muted/60 transition-shadow focus:border-gold focus:shadow-[0_0_0_3px_rgba(232,169,60,0.18)]';

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div className="aurora-backdrop relative hidden overflow-hidden bg-night-panel lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="relative z-10 font-display text-2xl font-semibold text-parchment">
          Salita
          <span aria-hidden="true" className="ml-2 inline-block h-1.5 w-6 rounded-full bg-gold" />
        </Link>

        <div className="relative z-10 max-w-md animate-fade-in-up">
          <p className="font-display text-4xl font-semibold leading-tight text-parchment">
            Filipino words,
            <br />
            and the history
            <br />
            packed inside them.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Sign in to pick up where you left off — vocabulary, quizzes, and the activities your
            teacher has set for you.
          </p>
        </div>

        <p className="relative z-10 text-xs text-muted">
          Mabuhay! Six centuries of trade, colonization, and slang, one word at a time.
        </p>
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-parchment lg:hidden"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Salita
          </Link>

          <div className="rounded-2xl border border-night-border bg-night-panel p-6 shadow-xl shadow-black/20 sm:p-8">
            <h1 className="font-display text-2xl font-semibold text-parchment">Sign in</h1>
            <p className="mt-1 text-sm text-muted">Choose how you&apos;ll be using Salita.</p>

            <div
              role="group"
              aria-label="Account type"
              className="relative mt-5 grid grid-cols-2 rounded-lg bg-night p-1"
            >
              <span
                aria-hidden="true"
                className="absolute inset-1 w-1/2 rounded-md bg-gold shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${roleIndex * 100}%)` }}
              />
              {ROLES.map((item) => {
                const isActive = item.id === role;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => chooseRole(item.id)}
                    className={`relative z-10 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'text-night' : 'text-muted hover:text-parchment'
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
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
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
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm text-parchment">
                  Password
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
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
              </div>

              {error && (
                <p
                  role="alert"
                  className="animate-fade-in rounded-lg border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-parchment"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-gold to-gold-soft px-4 py-2.5 text-sm font-semibold text-night shadow-md shadow-gold/20 transition-all hover:shadow-lg hover:shadow-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting && (
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-night/30 border-t-night"
                    />
                  )}
                  {isSubmitting ? 'Signing in…' : `Sign in as ${activeRole.label.toLowerCase()}`}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
