import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CreateStudentRequest, StudentAccount } from '@shared/types';
import { createStudentAccount, fetchStudents, updateStudentAccount } from '../../api/admin';
import { ApiRequestError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DashboardShell } from '../../components/layout/DashboardShell';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { CreateStudentForm } from '../../components/admin/CreateStudentForm';
import { StudentDirectoryTable } from '../../components/admin/StudentDirectoryTable';

export function UserManagementPage() {
  const { session } = useAuth();
  const token = session?.token ?? '';

  const [students, setStudents] = useState<StudentAccount[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchStudents(token)
      .then(setStudents)
      .catch((err: unknown) => {
        setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load students.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (request: CreateStudentRequest) => {
    setFormError(null);
    setSuccessMessage(null);
    setIsSaving(true);
    try {
      const created = await createStudentAccount(request, token);
      setStudents((prev) => (prev ? [...prev, created] : [created]));
      setSuccessMessage(`${created.fullName}'s account was created.`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Could not create the account.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (student: StudentAccount) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setPendingActionId(student.id);
    setLoadError(null);
    try {
      const updated = await updateStudentAccount(student.id, { status: nextStatus }, token);
      setStudents((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not update the account.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleResetPassword = async (student: StudentAccount, newPassword: string) => {
    setPendingActionId(student.id);
    setLoadError(null);
    try {
      const updated = await updateStudentAccount(student.id, { password: newPassword }, token);
      setStudents((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
      setSuccessMessage(`Password reset for ${student.fullName}.`);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not reset the password.');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <DashboardShell
      title="User management"
      subtitle="Create student accounts and manage who can sign in."
    >
      <Link
        to="/dashboard/admin"
        className="mb-6 inline-block text-sm text-muted underline-offset-2 hover:text-parchment hover:underline"
      >
        ← Back to dashboard
      </Link>

      {successMessage && (
        <p className="mb-6 rounded-lg border border-leaf/40 bg-leaf/10 px-4 py-3 text-sm text-leaf">
          {successMessage}
        </p>
      )}

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-parchment">Add a student</h2>
        <div className="mt-4 rounded-xl border border-night-border bg-night-panel p-6">
          <CreateStudentForm onSubmit={handleCreate} isSaving={isSaving} error={formError} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-parchment">Student directory</h2>
        <div className="mt-4">
          {isLoading && <LoadingState label="Loading students…" />}
          {loadError && <ErrorState message={loadError} onRetry={load} />}
          {students && !isLoading && !loadError && (
            <StudentDirectoryTable
              students={students}
              pendingActionId={pendingActionId}
              onToggleStatus={handleToggleStatus}
              onResetPassword={handleResetPassword}
            />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
