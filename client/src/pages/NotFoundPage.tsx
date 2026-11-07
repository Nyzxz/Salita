import { Link } from 'react-router-dom';
import { Brand } from '../components/common/Brand';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components/common/LoadingState';
import { dashboardPathFor } from '../auth/routes';

/** Shown for unknown URLs. Signed-out visitors are sent to sign in instead (see App routes). */
export function NotFoundPage() {
  const { session, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <div className="mx-auto max-w-5xl px-6">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  const home = session ? dashboardPathFor(session.user.role) : '/login';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Brand />
      <p className="eyebrow mt-10">Error 404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-parchment sm:text-5xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        We couldn&apos;t find the page you were looking for. The link may be mistyped or the page may have moved.
      </p>
      <Link to={home} className="btn-primary mt-8">
        {session ? 'Back to your dashboard' : 'Go to sign in'}
      </Link>
    </main>
  );
}
