import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@shared/types';
import { LoadingState } from '../components/common/LoadingState';
import { useAuth } from './AuthContext';
import { dashboardPathFor } from './routes';

interface ProtectedRouteProps {
  role: UserRole;
  children: ReactNode;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { session, isRestoring } = useAuth();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="mx-auto max-w-5xl px-6">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (session.user.role !== role) {
    return <Navigate to={dashboardPathFor(session.user.role)} replace />;
  }
  return <>{children}</>;
}
