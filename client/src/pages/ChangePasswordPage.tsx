import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { dashboardPathFor } from '../auth/routes';
import { Brand } from '../components/common/Brand';
import { ShieldIcon } from '../components/common/icons';
import { LoadingState } from '../components/common/LoadingState';
import { ChangePasswordForm } from '../components/profile/ChangePasswordForm';

/**
 * Shown to a student right after their first sign-in (or after a teacher
 * resets their password). Nothing else in the app works until it is done.
 */
export function ChangePasswordPage() {
  const { session, isRestoring } = useAuth();
  const navigate = useNavigate();

  if (isRestoring) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  // Nothing to change: send them on to their dashboard.
  if (!session.user.mustChangePassword) {
    return <Navigate to={dashboardPathFor(session.user.role)} replace />;
  }

  return (
    <div className="aurora-backdrop grid-dots relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
        <Brand />

        <div className="surface mt-8 w-full animate-scale-in p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-parchment">Create your own password</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Welcome, {session.user.name.split(' ')[0]}! Your teacher gave you a temporary password. Replace it with one only
            you know before you continue.
          </p>

          <div className="mt-6">
            <ChangePasswordForm
              submitLabel="Save password & continue"
              onChanged={() => navigate(dashboardPathFor(session.user.role), { replace: true })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
