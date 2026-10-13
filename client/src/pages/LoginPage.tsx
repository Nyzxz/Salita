import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from '@shared/types';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dashboardPathFor } from '../auth/routes';
import { Brand } from '../components/common/Brand';
import { BookIcon, ChartIcon, EyeIcon, EyeOffIcon, LockIcon, QuizIcon, UserIcon } from '../components/common/icons';
import { Notice } from '../components/ui/Notice';

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
  const [showPassword, setShowPassword] = useState(false);
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
  const inputClasses = 'field pl-10';

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      <aside className="aurora-backdrop grid-dots relative hidden overflow-hidden border-r border-night-border bg-night-deep lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Brand className="relative z-10" />

        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <p className="eyebrow">Filipino language &amp; culture</p>
          <h2 className="mt-4 text-5xl font-semibold leading-[1.1] text-parchment">
            Learn the words.
            <br />
            <span className="text-gradient-gold">Discover the stories.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            A guided classroom for Filipino vocabulary and the history packed inside every word —
            lectures, quizzes, and tasks from your teacher, all in one place.
          </p>

          <ul className="mt-10 grid gap-4">
            {[
              { icon: BookIcon, title: 'Lectures with etymology', text: 'Every word comes with its cultural and historical context.' },
              { icon: QuizIcon, title: 'Scored quizzes', text: 'Test yourself and see your results saved to your account.' },
              { icon: ChartIcon, title: 'Grades & feedback', text: 'Track your progress and read your teacher’s feedback.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-parchment">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-muted">Mabuhay! Six centuries of trade, colonization, and slang — one word at a time.</p>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Brand />
        </div>

        <div className="w-full max-w-[26rem] animate-scale-in">
          <div className="mb-7">
            <h1 className="text-3xl font-semibold text-parchment">Welcome back</h1>
            <p className="mt-2 text-sm text-muted">Sign in to continue to your Salita workspace.</p>
          </div>

          <div className="surface p-6 sm:p-7">
            <div
              role="group"
              aria-label="Account type"
              className="relative grid grid-cols-2 rounded-xl border border-night-border bg-night-deep p-1"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-night-raised shadow-sm ring-1 ring-gold/40 transition-transform duration-300 ease-out"
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
                    className={`relative z-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive ? 'text-gold-soft' : 'text-muted hover:text-parchment'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-xs text-muted">{activeRole.hint}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
              <div>
                <label htmlFor="username" className="field-label">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
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
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`${inputClasses} pr-11`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-parchment"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <Notice tone="error">{error}</Notice>}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
                {isSubmitting && (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-night/30 border-t-night"
                  />
                )}
                {isSubmitting ? 'Signing in…' : `Sign in as ${activeRole.label.toLowerCase()}`}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            Accounts are created by your teacher. Trouble signing in? Ask your teacher to reset your password.
          </p>
        </div>
      </main>
    </div>
  );
}
